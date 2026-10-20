from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import models, database, auth

router = APIRouter(prefix="/schedule", tags=["schedule"])

class ScheduleCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: int
    day_of_week: int  # 1=Monday..6=Saturday
    lesson_number: int
    start_time: str
    end_time: str

class ScheduleOut(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: int
    day_of_week: int
    lesson_number: int
    start_time: str
    end_time: str
    class_name: Optional[str] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/teachers")
def get_teachers(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    teachers = db.query(models.User).filter(models.User.role == "teacher").all()
    admins = db.query(models.User).filter(models.User.role == "admin").all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in (teachers + admins)]

def get_schedule_details(db: Session, query_filter):
    items = db.query(
        models.Schedule,
        models.Class.name.label("class_name"),
        models.Subject.name.label("subject_name"),
        models.User.username.label("teacher_name")
    ).join(models.Class, models.Schedule.class_id == models.Class.id)\
     .join(models.Subject, models.Schedule.subject_id == models.Subject.id)\
     .join(models.User, models.Schedule.teacher_id == models.User.id)\
     .filter(query_filter)\
     .order_by(models.Schedule.day_of_week, models.Schedule.lesson_number)\
     .all()
     
    out = []
    for item, class_name, subject_name, teacher_name in items:
        out.append({
            "id": item.id,
            "class_id": item.class_id,
            "subject_id": item.subject_id,
            "teacher_id": item.teacher_id,
            "day_of_week": item.day_of_week,
            "lesson_number": item.lesson_number,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "class_name": class_name,
            "subject_name": subject_name,
            "teacher_name": teacher_name
        })
    return out

@router.get("/", response_model=List[ScheduleOut])
def get_schedule(
    class_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    filt = True
    if class_id is not None:
        filt = (models.Schedule.class_id == class_id)
    return get_schedule_details(db, filt)

@router.get("/teacher/{teacher_id}", response_model=List[ScheduleOut])
def get_teacher_schedule(
    teacher_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return get_schedule_details(db, models.Schedule.teacher_id == teacher_id)

@router.get("/today", response_model=List[ScheduleOut])
def get_today_schedule(
    class_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    from datetime import timezone, timedelta
    uzb_tz = timezone(timedelta(hours=5))
    today_weekday = datetime.now(uzb_tz).isoweekday()
    filt = (models.Schedule.day_of_week == today_weekday)
    if class_id is not None:
        filt = filt & (models.Schedule.class_id == class_id)
        
    return get_schedule_details(db, filt)

@router.post("/", response_model=ScheduleOut, status_code=201)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to manage schedules")
        
    cls = db.query(models.Class).filter(models.Class.id == data.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    sub = db.query(models.Subject).filter(models.Subject.id == data.subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    tchr = db.query(models.User).filter(models.User.id == data.teacher_id).first()
    if not tchr:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    schedule = models.Schedule(
        class_id=data.class_id,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        day_of_week=data.day_of_week,
        lesson_number=data.lesson_number,
        start_time=data.start_time,
        end_time=data.end_time
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    
    return {
        "id": schedule.id,
        "class_id": schedule.class_id,
        "subject_id": schedule.subject_id,
        "teacher_id": schedule.teacher_id,
        "day_of_week": schedule.day_of_week,
        "lesson_number": schedule.lesson_number,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "class_name": cls.name,
        "subject_name": sub.name,
        "teacher_name": tchr.username
    }

@router.put("/{id}", response_model=ScheduleOut)
def update_schedule(
    id: int,
    data: ScheduleCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to manage schedules")
        
    schedule = db.query(models.Schedule).filter(models.Schedule.id == id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule entry not found")
        
    cls = db.query(models.Class).filter(models.Class.id == data.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    sub = db.query(models.Subject).filter(models.Subject.id == data.subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    tchr = db.query(models.User).filter(models.User.id == data.teacher_id).first()
    if not tchr:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    schedule.class_id = data.class_id
    schedule.subject_id = data.subject_id
    schedule.teacher_id = data.teacher_id
    schedule.day_of_week = data.day_of_week
    schedule.lesson_number = data.lesson_number
    schedule.start_time = data.start_time
    schedule.end_time = data.end_time
    
    db.commit()
    db.refresh(schedule)
    
    return {
        "id": schedule.id,
        "class_id": schedule.class_id,
        "subject_id": schedule.subject_id,
        "teacher_id": schedule.teacher_id,
        "day_of_week": schedule.day_of_week,
        "lesson_number": schedule.lesson_number,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "class_name": cls.name,
        "subject_name": sub.name,
        "teacher_name": tchr.username
    }

@router.delete("/{id}")
def delete_schedule(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to manage schedules")
        
    schedule = db.query(models.Schedule).filter(models.Schedule.id == id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule entry not found")
        
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule entry deleted"}
