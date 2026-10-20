from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, time, datetime

class UserBase(BaseModel):
    username: str
    role: str
    class_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class ClassBase(BaseModel):
    name: str
    grade: str
    teacher_id: Optional[int] = None

class ClassCreate(ClassBase):
    pass

class ClassResponse(ClassBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class StudentBase(BaseModel):
    full_name: str
    student_code: str
    class_id: int
    parent_telegram_id: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: int
    photo_path: Optional[str] = None
    created_at: datetime
    has_face_registered: bool = False
    qr_code_id: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class AttendanceBase(BaseModel):
    student_id: int
    date: date
    time: time
    status: str
    marked_by: str
    is_late: bool = False
    minutes_late: int = 0

class AttendanceResponse(AttendanceBase):
    id: int
    student: StudentResponse
    
    model_config = ConfigDict(from_attributes=True)

class AttendanceManualCreate(BaseModel):
    student_id: int
    status: str = "present"

class RecognizeResponse(BaseModel):
    student_id: int
    full_name: str
    confidence: float
    message: str
    already_marked: bool

class SchoolSettingsBase(BaseModel):
    school_start_time: str
    late_threshold_minutes: int

class SchoolSettingsResponse(SchoolSettingsBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

