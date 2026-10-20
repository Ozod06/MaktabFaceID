from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import qrcode
from io import BytesIO
import base64
import models, database, auth
from routers.attendance import mark_attendance_for_student

router = APIRouter(
    prefix="/qr",
    tags=["qr"]
)

class QRCheckinRequest(BaseModel):
    qr_code_id: str

@router.post("/generate/{student_id}")
def generate_qr(student_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Generate new UUID
    qr_id = str(uuid.uuid4())
    student.qr_code_id = qr_id
    db.commit()
    db.refresh(student)
    
    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    qr_image_url = f"data:image/png;base64,{img_base64}"
    
    return {
        "qr_code_id": qr_id,
        "qr_image": qr_image_url
    }

@router.post("/checkin")
def qr_checkin(
    payload: QRCheckinRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db)
):
    student = db.query(models.Student).filter(models.Student.qr_code_id == payload.qr_code_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found with this QR code"
        )
        
    attendance, already_marked = mark_attendance_for_student(
        student_id=student.id,
        db=db,
        background_tasks=background_tasks,
        marked_by="qr"
    )
    
    return {
        "status": "success",
        "student_id": student.id,
        "full_name": student.full_name,
        "is_late": attendance.is_late,
        "minutes_late": attendance.minutes_late,
        "already_marked": already_marked,
        "time": attendance.time.strftime("%H:%M:%S")
    }

@router.get("/{student_id}/image")
def get_qr_image(student_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if current_user.role not in ["admin", "teacher"]:
        if current_user.username != student.student_code:
            raise HTTPException(status_code=403, detail="Ruxsat berilmagan / Permission denied")

    if not student.qr_code_id:
        student.qr_code_id = str(uuid.uuid4())
        db.commit()
        db.refresh(student)
        
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(student.qr_code_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    buffered.seek(0)
    
    return StreamingResponse(buffered, media_type="image/png")
