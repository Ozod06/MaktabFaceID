from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date
import models, database, auth
import csv
import io

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

@router.get("/daily")
def get_daily_reports(report_date: date = date.today(), class_id: Optional[int] = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    # Total students
    query_total = db.query(models.Student)
    if class_id:
        query_total = query_total.filter(models.Student.class_id == class_id)
    total_students = query_total.count()
    
    # Present students today
    query_present = db.query(models.Attendance).filter(
        models.Attendance.date == report_date,
        models.Attendance.status == "present"
    )
    if class_id:
        query_present = query_present.join(models.Student).filter(models.Student.class_id == class_id)
    present_students = query_present.count()
    
    absent_students = total_students - present_students
    attendance_rate = (present_students / total_students * 100) if total_students > 0 else 0
    
    return {
        "date": report_date,
        "total_students": total_students,
        "present_students": present_students,
        "absent_students": absent_students,
        "attendance_rate": round(attendance_rate, 2)
    }

@router.get("/export")
def export_csv(class_id: Optional[int] = None, report_date: date = date.today(), db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    query = db.query(models.Student).options(joinedload(models.Student.student_class))
    if class_id:
        query = query.filter(models.Student.class_id == class_id)
        
    students = query.all()
    
    attendances = db.query(models.Attendance).filter(models.Attendance.date == report_date).all()
    attendance_map = {a.student_id: a for a in attendances}
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Code", "Full Name", "Class", "Status", "Time", "Marked By"])
    
    for s in students:
        att = attendance_map.get(s.id)
        status = att.status if att else "absent"
        time_str = att.time.strftime("%H:%M:%S") if att else ""
        marked_by = att.marked_by if att else ""
        class_name = s.student_class.name if s.student_class else ""
        
        writer.writerow([s.student_code, s.full_name, class_name, status, time_str, marked_by])
        
    response = Response(content=output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename=attendance_{report_date}.csv"
    response.headers["Content-Type"] = "text/csv"
    return response
