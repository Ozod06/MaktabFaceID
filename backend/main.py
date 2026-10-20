from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
import numpy as np
import os

import models, database, auth, schemas, face_engine
from routers import classes, students, attendance, reports, tests, subjects, schedule, grades, settings, qr_checkin

@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=database.engine)
    os.makedirs("photos", exist_ok=True)
    
    # Run SQLite schema self-migrations to add columns if missing
    from sqlalchemy import text
    with database.engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE students ADD COLUMN qr_code_id VARCHAR"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE attendances ADD COLUMN is_late BOOLEAN DEFAULT 0"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE attendances ADD COLUMN minutes_late INTEGER DEFAULT 0"))
        except Exception:
            pass
            
    db = database.SessionLocal()
    auth.create_default_admin(db)
    face_engine.load_known_embeddings(db)
    db.close()
    yield
    face_engine.known_embeddings.clear()
    # Close shared telegram HTTP client
    import telegram_bot
    await telegram_bot.close_client()

app = FastAPI(title="School Face Recognition Attendance System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/photos", StaticFiles(directory="photos"), name="photos")

app.include_router(classes.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(tests.router)
app.include_router(subjects.router)
app.include_router(schedule.router)
app.include_router(grades.router)
app.include_router(settings.router)
app.include_router(qr_checkin.router)

@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    from datetime import timedelta
    access_token = auth.create_access_token(
        data={"sub": user.username}, 
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

@app.get("/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@app.get("/")
def root():
    return {"message": "Welcome to School Face Recognition API"}