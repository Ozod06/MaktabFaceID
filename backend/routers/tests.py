from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import models, database, auth
import os
import json
import httpx

router = APIRouter(prefix="/tests", tags=["tests"])

# ─── Schemas ────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # a, b, c, d

class QuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str

    class Config:
        from_attributes = True

class QuestionWithAnswer(QuestionOut):
    correct_answer: str

class TestCreate(BaseModel):
    title: str
    subject: str
    class_id: Optional[int] = None
    time_limit: int = 30

class TestOut(BaseModel):
    id: int
    title: str
    subject: str
    class_id: Optional[int]
    time_limit: int
    is_active: bool
    created_at: datetime
    question_count: int = 0

    class Config:
        from_attributes = True

class SubmitAnswers(BaseModel):
    answers: dict  # {question_id: "a/b/c/d"}

class GenerateQuestionsRequest(BaseModel):
    topic: str
    num_questions: int = 10
    difficulty: str = "medium"  # easy, medium, hard

# ─── Helper ─────────────────────────────────────────────────

def get_db():
    return next(database.get_db())

# ─── Routes ─────────────────────────────────────────────────

@router.post("/", status_code=201)
def create_test(
    data: TestCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    test = models.Test(
        title=data.title,
        subject=data.subject,
        class_id=data.class_id,
        time_limit=data.time_limit,
        created_by=current_user.id
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return {**test.__dict__, "question_count": 0}


@router.get("/")
def get_tests(
    class_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Test)
    if class_id:
        query = query.filter(models.Test.class_id == class_id)
    tests = query.all()
    result = []
    for t in tests:
        result.append({
            "id": t.id,
            "title": t.title,
            "subject": t.subject,
            "class_id": t.class_id,
            "time_limit": t.time_limit,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "question_count": len(t.questions)
        })
    return result


@router.get("/my")
def get_my_tests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """O'quvchi uchun — o'z sinfi testlari"""
    student = db.query(models.Student).filter(
        models.Student.student_code == current_user.username
    ).first()

    query = db.query(models.Test).filter(models.Test.is_active == True)
    if student:
        query = query.filter(
            (models.Test.class_id == student.class_id) | (models.Test.class_id == None)
        )
    tests = query.all()

    result = []
    for t in tests:
        existing_result = db.query(models.TestResult).filter(
            models.TestResult.test_id == t.id,
            models.TestResult.student_id == (student.id if student else -1)
        ).first()
        result.append({
            "id": t.id,
            "title": t.title,
            "subject": t.subject,
            "time_limit": t.time_limit,
            "question_count": len(t.questions),
            "completed": existing_result is not None,
            "score": existing_result.score if existing_result else None,
            "total": existing_result.total_questions if existing_result else None,
        })
    return result


@router.get("/{test_id}")
def get_test(
    test_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return {
        "id": test.id,
        "title": test.title,
        "subject": test.subject,
        "class_id": test.class_id,
        "time_limit": test.time_limit,
        "is_active": test.is_active,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer
            } for q in test.questions
        ]
    }


@router.post("/{test_id}/questions", status_code=201)
def add_question(
    test_id: int,
    data: QuestionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    question = models.Question(
        test_id=test_id,
        question_text=data.question_text,
        option_a=data.option_a,
        option_b=data.option_b,
        option_c=data.option_c,
        option_d=data.option_d,
        correct_answer=data.correct_answer.lower()
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{test_id}")
def delete_test(
    test_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    db.delete(test)
    db.commit()
    return {"message": "Test deleted"}


@router.patch("/{test_id}/toggle")
def toggle_test(
    test_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    test.is_active = not test.is_active
    db.commit()
    return {"is_active": test.is_active}


@router.get("/{test_id}/take")
def take_test(
    test_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Test savollarini to'g'ri javoblarsiz qaytaradi"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if not test.is_active:
        raise HTTPException(status_code=400, detail="Test is not active")

    return {
        "id": test.id,
        "title": test.title,
        "subject": test.subject,
        "time_limit": test.time_limit,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
            } for q in test.questions
        ]
    }


@router.post("/{test_id}/submit")
def submit_test(
    test_id: int,
    data: SubmitAnswers,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Testni topshirish va baholash"""
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    student = db.query(models.Student).filter(
        models.Student.student_code == current_user.username
    ).first()

    # Baholash
    score = 0
    total = len(test.questions)
    for q in test.questions:
        user_answer = data.answers.get(str(q.id), "").lower()
        if user_answer == q.correct_answer.lower():
            score += 1

    # Natijani saqlash
    result = models.TestResult(
        test_id=test_id,
        student_id=student.id if student else current_user.id,
        score=score,
        total_questions=total,
        finished_at=datetime.utcnow(),
        answers=data.answers
    )
    db.add(result)
    db.commit()

    return {
        "score": score,
        "total": total,
        "percentage": round(score / total * 100) if total > 0 else 0,
        "message": "Test topshirildi!"
    }


@router.get("/{test_id}/results")
def get_results(
    test_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    results = db.query(models.TestResult, models.Student).outerjoin(
        models.Student, models.Student.id == models.TestResult.student_id
    ).filter(
        models.TestResult.test_id == test_id
    ).all()

    out = []
    for r, student in results:
        out.append({
            "id": r.id,
            "student_name": student.full_name if student else "Noma'lum",
            "student_code": student.student_code if student else "-",
            "score": r.score,
            "total": r.total_questions,
            "percentage": round(r.score / r.total_questions * 100) if r.total_questions > 0 else 0,
            "finished_at": r.finished_at,
        })
    return sorted(out, key=lambda x: x["percentage"], reverse=True)


@router.post("/{test_id}/generate")
async def generate_questions(
    test_id: int,
    data: GenerateQuestionsRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """AI yordamida savollar yaratish"""
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

    prompt = f"""Generate {data.num_questions} multiple choice questions about "{data.topic}" for subject "{test.subject}".
Difficulty: {data.difficulty}.
Return ONLY a valid JSON array, no other text:
[
  {{
    "question_text": "question here",
    "option_a": "option A",
    "option_b": "option B", 
    "option_c": "option C",
    "option_d": "option D",
    "correct_answer": "a"
  }}
]"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 4000,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=30.0
        )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="AI API error")

    content = response.json()["content"][0]["text"]

    # JSON parse
    try:
        start = content.find("[")
        end = content.rfind("]") + 1
        questions_data = json.loads(content[start:end])
    except Exception:
        raise HTTPException(status_code=500, detail="Could not parse AI response")

    # Savollarni bazaga saqlash
    saved = []
    for q in questions_data:
        question = models.Question(
            test_id=test_id,
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"].lower()
        )
        db.add(question)
        saved.append(q)

    db.commit()
    return {"generated": len(saved), "questions": saved}