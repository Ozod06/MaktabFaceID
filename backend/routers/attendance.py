from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, time, timedelta, timezone
import calendar
import models, schemas, database, auth, face_engine, telegram_bot

router = APIRouter(
    prefix="/attendance",
    tags=["attendance"]
)

def mark_attendance_for_student(student_id: int, db: Session, background_tasks: BackgroundTasks, marked_by: str = "camera"):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    uzb_tz = timezone(timedelta(hours=5))
    now_local = datetime.now(uzb_tz)
    today = now_local.date()
    current_time = now_local.time()
    
    existing_attendance = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.date == today
    ).first()
    
    already_marked = existing_attendance is not None
    
    if not already_marked:
        new_attendance = models.Attendance(
            student_id=student_id,
            status="present",
            marked_by=marked_by,
            date=today,
            time=current_time
        )
        db.add(new_attendance)
        db.commit()
        db.refresh(new_attendance)
        
        # 1. Query SchoolSettings (create default if missing)
        settings = db.query(models.SchoolSettings).first()
        if not settings:
            settings = models.SchoolSettings(
                school_start_time="08:30",
                late_threshold_minutes=10
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
            
        # 2. Parse school_start_time + late_threshold_minutes into a cutoff datetime for today
        try:
            start_hour, start_min = map(int, settings.school_start_time.split(':'))
        except Exception:
            start_hour, start_min = 8, 30
            
        checkin_datetime = datetime.combine(today, current_time)
        cutoff_time_min = start_min + settings.late_threshold_minutes
        cutoff_datetime = datetime.combine(today, time(start_hour, 0)) + timedelta(minutes=cutoff_time_min)
        
        # 3. Compare against the check-in time
        is_late = checkin_datetime > cutoff_datetime
        
        # 4. If late: set is_late=True, minutes_late=<calculated>, commit
        if is_late:
            minutes_late = int((checkin_datetime - cutoff_datetime).total_seconds() / 60)
            new_attendance.is_late = True
            new_attendance.minutes_late = minutes_late
            db.commit()
            db.refresh(new_attendance)
            
            # 5. Send telegram notification in background
            time_str = new_attendance.time.strftime("%H:%M:%S")
            if student.parent_telegram_id:
                msg = f"⏰ {student.full_name} {minutes_late} daqiqa kech keldi. Vaqt: {time_str}"
                background_tasks.add_task(
                    telegram_bot.send_message,
                    student.parent_telegram_id,
                    msg
                )
        else:
            # Send standard on-time notification
            time_str = new_attendance.time.strftime("%H:%M:%S")
            if student.parent_telegram_id:
                background_tasks.add_task(
                    telegram_bot.send_attendance_notification,
                    student.parent_telegram_id,
                    student.full_name,
                    time_str
                )
        return new_attendance, already_marked
    return existing_attendance, already_marked

@router.post("/recognize", response_model=schemas.RecognizeResponse)
async def recognize_and_mark(background_tasks: BackgroundTasks, image: UploadFile = File(...), db: Session = Depends(database.get_db)):
    contents = await image.read()
    
    student_id, confidence = face_engine.recognize_face(contents, face_engine.known_embeddings)
    
    if student_id is None:
        raise HTTPException(status_code=404, detail="Face not recognized")
        
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in database")
        
    attendance_record, already_marked = mark_attendance_for_student(
        student_id=student.id,
        db=db,
        background_tasks=background_tasks,
        marked_by="camera"
    )
            
    return schemas.RecognizeResponse(
        student_id=student.id,
        full_name=student.full_name,
        confidence=confidence,
        message="Attendance marked" if not already_marked else "Already marked",
        already_marked=already_marked
    )

@router.get("/today", response_model=List[schemas.AttendanceResponse])
def get_today_attendance(class_id: Optional[int] = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    uzb_tz = timezone(timedelta(hours=5))
    today = datetime.now(uzb_tz).date()
    query = db.query(models.Attendance).filter(models.Attendance.date == today)
    
    if class_id:
        query = query.join(models.Student).filter(models.Student.class_id == class_id)
        
    return query.all()

@router.post("/manual", response_model=schemas.AttendanceResponse)
def mark_manual(data: schemas.AttendanceManualCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.id == data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    uzb_tz = timezone(timedelta(hours=5))
    today = datetime.now(uzb_tz).date()
    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == data.student_id,
        models.Attendance.date == today
    ).first()
    
    if existing:
        existing.status = data.status
        existing.marked_by = current_user.username
        db.commit()
        db.refresh(existing)
        return existing
        
    new_attendance = models.Attendance(
        student_id=data.student_id,
        status=data.status,
        marked_by=current_user.username,
        date=today,
        time=datetime.now(uzb_tz).time()
    )
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    return new_attendance

@router.get("/late-today", response_model=List[schemas.AttendanceResponse])
def get_late_today(
    class_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    uzb_tz = timezone(timedelta(hours=5))
    today = datetime.now(uzb_tz).date()
    query = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.is_late == True
    )
    if class_id:
        query = query.join(models.Student).filter(models.Student.class_id == class_id)
    return query.all()

@router.get("/late-report", response_model=List[schemas.AttendanceResponse])
def get_late_report(
    month: str,  # format YYYY-MM
    student_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        year, m = map(int, month.split('-'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format, expected YYYY-MM")
        
    last_day = calendar.monthrange(year, m)[1]
    start_date = date(year, m, 1)
    end_date = date(year, m, last_day)
    
    query = db.query(models.Attendance).filter(
        models.Attendance.is_late == True,
        models.Attendance.date >= start_date,
        models.Attendance.date <= end_date
    )
    if student_id:
        query = query.filter(models.Attendance.student_id == student_id)
    return query.all()

