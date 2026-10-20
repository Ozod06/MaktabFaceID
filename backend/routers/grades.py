from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date as dt_date, datetime
from pydantic import BaseModel
import models, database, auth

router = APIRouter(prefix="/grades", tags=["grades"])

class GradeCreate(BaseModel):
    student_id: int
    subject_id: int
    grade_value: int  # 2, 3, 4, 5
    date: dt_date
    lesson_topic: Optional[str] = None
    comment: Optional[str] = None

class GradeOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    teacher_id: int
    grade_value: int
    date: dt_date
    lesson_topic: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=GradeOut, status_code=201)
def create_grade(
    data: GradeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized to record grades")
        
    student = db.query(models.Student).filter(models.Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    subject = db.query(models.Subject).filter(models.Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    grade = models.Grade(
        student_id=data.student_id,
        subject_id=data.subject_id,
        teacher_id=current_user.id,
        grade_value=data.grade_value,
        date=data.date,
        lesson_topic=data.lesson_topic,
        comment=data.comment
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    
    return {
        **grade.__dict__,
        "subject_name": subject.name,
        "teacher_name": current_user.username
    }

@router.get("/", response_model=List[GradeOut])
def get_grades(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    month: Optional[str] = None,  # YYYY-MM
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(
        models.Grade,
        models.Subject.name.label("subject_name"),
        models.User.username.label("teacher_name")
    ).join(models.Subject, models.Grade.subject_id == models.Subject.id)\
     .join(models.User, models.Grade.teacher_id == models.User.id)
     
    if student_id is not None:
        query = query.filter(models.Grade.student_id == student_id)
    if subject_id is not None:
        query = query.filter(models.Grade.subject_id == subject_id)
    if month is not None:
        query = query.filter(func.strftime("%Y-%m", models.Grade.date) == month)
        
    results = query.order_by(models.Grade.date.desc()).all()
    
    out = []
    for grade, subject_name, teacher_name in results:
        out.append({
            "id": grade.id,
            "student_id": grade.student_id,
            "subject_id": grade.subject_id,
            "teacher_id": grade.teacher_id,
            "grade_value": grade.grade_value,
            "date": grade.date,
            "lesson_topic": grade.lesson_topic,
            "comment": grade.comment,
            "created_at": grade.created_at,
            "subject_name": subject_name,
            "teacher_name": teacher_name
        })
    return out

@router.get("/student/{student_id}/average")
def get_student_average(
    student_id: int,
    subject_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    avg_data = db.query(
        func.avg(models.Grade.grade_value),
        func.count(models.Grade.id)
    ).filter(
        models.Grade.student_id == student_id,
        models.Grade.subject_id == subject_id
    ).first()
    
    return {
        "student_id": student_id,
        "subject_id": subject_id,
        "average": round(avg_data[0], 2) if avg_data[0] is not None else 0.0,
        "count": avg_data[1]
    }

@router.get("/student/{student_id}/summary")
def get_student_summary(
    student_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    subjects = db.query(models.Subject).all()
    
    avg_data = db.query(
        models.Grade.subject_id,
        func.avg(models.Grade.grade_value),
        func.count(models.Grade.id)
    ).filter(
        models.Grade.student_id == student_id
    ).group_by(models.Grade.subject_id).all()
    
    stats_map = {row[0]: (row[1], row[2]) for row in avg_data}
    
    summary = []
    for sub in subjects:
        avg_val, count_val = stats_map.get(sub.id, (None, 0))
        summary.append({
            "subject_id": sub.id,
            "subject_name": sub.name,
            "subject_code": sub.code,
            "average": round(avg_val, 2) if avg_val is not None else 0.0,
            "count": count_val
        })
    return summary

@router.put("/{id}", response_model=GradeOut)
def update_grade(
    id: int,
    data: GradeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit grades")
        
    grade = db.query(models.Grade).filter(models.Grade.id == id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
        
    student = db.query(models.Student).filter(models.Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    subject = db.query(models.Subject).filter(models.Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    grade.student_id = data.student_id
    grade.subject_id = data.subject_id
    grade.grade_value = data.grade_value
    grade.date = data.date
    grade.lesson_topic = data.lesson_topic
    grade.comment = data.comment
    
    db.commit()
    db.refresh(grade)
    
    teacher = db.query(models.User).filter(models.User.id == grade.teacher_id).first()
    
    return {
        **grade.__dict__,
        "subject_name": subject.name,
        "teacher_name": teacher.username if teacher else "Unknown"
    }

@router.delete("/{id}")
def delete_grade(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete grades")
        
    grade = db.query(models.Grade).filter(models.Grade.id == id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
        
    db.delete(grade)
    db.commit()
    return {"message": "Grade deleted"}

@router.get("/class/{class_id}/journal")
def get_class_journal(
    class_id: int,
    subject_id: int,
    month: str,  # YYYY-MM
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    students = db.query(models.Student).filter(models.Student.class_id == class_id).all()
    
    student_ids = [std.id for std in students]
    all_grades = []
    if student_ids:
        all_grades = db.query(models.Grade).filter(
            models.Grade.student_id.in_(student_ids),
            models.Grade.subject_id == subject_id,
            func.strftime("%Y-%m", models.Grade.date) == month
        ).order_by(models.Grade.date).all()
        
    from collections import defaultdict
    grades_by_student = defaultdict(list)
    for g in all_grades:
        grades_by_student[g.student_id].append({
            "id": g.id,
            "grade_value": g.grade_value,
            "date": g.date.isoformat() if hasattr(g.date, "isoformat") else str(g.date),
            "lesson_topic": g.lesson_topic,
            "comment": g.comment
        })
        
    journal = []
    for std in students:
        journal.append({
            "student_id": std.id,
            "student_name": std.full_name,
            "student_code": std.student_code,
            "grades": grades_by_student[std.id]
        })
        
    return journal
