from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database, auth

router = APIRouter(
    prefix="/classes",
    tags=["classes"]
)

@router.get("/", response_model=List[schemas.ClassResponse])
def read_classes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role == "admin":
        classes = db.query(models.Class).offset(skip).limit(limit).all()
    else:
        # Teachers can only see their own class, or all classes depending on requirements. 
        # For this system we'll let teachers see all classes in list, but restrict reports if needed.
        classes = db.query(models.Class).offset(skip).limit(limit).all()
    return classes

@router.post("/", response_model=schemas.ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(class_data: schemas.ClassCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to create classes")
        
    db_class = models.Class(**class_data.model_dump())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class
