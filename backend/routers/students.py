from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import time
import models, schemas, database, auth, face_engine

router = APIRouter(
    prefix="/students",
    tags=["students"]
)

PHOTO_DIR = "photos"
os.makedirs(PHOTO_DIR, exist_ok=True)

@router.get("/", response_model=List[schemas.StudentResponse])
def read_students(class_id: Optional[int] = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    query = db.query(models.Student)
    if class_id is not None:
        query = query.filter(models.Student.class_id == class_id)
        
    students = query.all()
    # map to response
    response_students = []
    for s in students:
        s_resp = schemas.StudentResponse.model_validate(s)
        s_resp.has_face_registered = s.face_embedding is not None
        response_students.append(s_resp)
        
    return response_students

@router.post("/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student_data: schemas.StudentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    # Check if code exists
    existing = db.query(models.Student).filter(models.Student.student_code == student_data.student_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student code already exists")
        
    db_student = models.Student(**student_data.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    
    resp = schemas.StudentResponse.model_validate(db_student)
    return resp

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete students")
        
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    db.delete(student)
    db.commit()
    
    # Remove from face recognition cache to avoid memory leaks
    face_engine.known_embeddings.pop(student_id, None)
    return None

@router.post("/{student_id}/register-face")
async def register_student_face(student_id: int, image: UploadFile = File(...), db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    contents = await image.read()
    
    try:
        embedding = face_engine.get_face_embedding(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Save photo to disk
    file_extension = image.filename.split(".")[-1] if "." in image.filename else "jpg"
    photo_filename = f"student_{student_id}_{int(time.time())}.{file_extension}"
    photo_path = os.path.join(PHOTO_DIR, photo_filename)
    
    with open(photo_path, "wb") as f:
        f.write(contents)
        
    student.face_embedding = embedding.tobytes()
    student.photo_path = f"/photos/{photo_filename}"
    
    db.commit()
    
    # Update global face cache in face_engine
    face_engine.known_embeddings[student.id] = embedding
    
    return {"message": "Face registered successfully", "photo_path": student.photo_path}
