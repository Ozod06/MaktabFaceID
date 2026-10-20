from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, database, auth

router = APIRouter(
    prefix="/settings",
    tags=["settings"]
)

@router.get("/", response_model=schemas.SchoolSettingsResponse)
def get_settings(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    settings = db.query(models.SchoolSettings).first()
    if not settings:
        settings = models.SchoolSettings(
            school_start_time="08:30",
            late_threshold_minutes=10
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/", response_model=schemas.SchoolSettingsResponse)
def update_settings(
    settings_data: schemas.SchoolSettingsBase,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify school settings"
        )
        
    settings = db.query(models.SchoolSettings).first()
    if not settings:
        settings = models.SchoolSettings()
        db.add(settings)
        
    settings.school_start_time = settings_data.school_start_time
    settings.late_threshold_minutes = settings_data.late_threshold_minutes
    db.commit()
    db.refresh(settings)
    return settings
