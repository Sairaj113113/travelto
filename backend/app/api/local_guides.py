from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Session

from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.models.user import User


router = APIRouter(
    prefix="/local-guides",
    tags=["Local Guides"],
)


# ============================================================
# DATABASE MODEL
# ============================================================

class LocalGuide(Base):
    __tablename__ = "local_guides"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    full_name = Column(Text, nullable=False)
    phone = Column(Text, nullable=True)
    location = Column(Text, nullable=False)
    places_covered = Column(ARRAY(Text), nullable=False, default=list)
    price_per_day = Column(Numeric(10, 2), nullable=False)
    languages = Column(ARRAY(Text), nullable=False, default=list)
    experience = Column(Text, nullable=True)
    about_me = Column(Text, nullable=True)
    profile_photo = Column(Text, nullable=True)

    is_available = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# ============================================================
# REQUEST SCHEMA
# ============================================================

class LocalGuideCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    location: str = Field(min_length=2, max_length=150)
    places_covered: list[str] = Field(min_length=1)
    price_per_day: float = Field(ge=0, le=1000000)
    languages: list[str] = Field(min_length=1)
    experience: Optional[str] = None
    about_me: Optional[str] = None
    profile_photo: Optional[str] = None
    is_available: bool = True


class LocalGuideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: str
    location: str
    places_covered: list[str]
    price_per_day: float
    languages: list[str]
    experience: Optional[str] = None
    about_me: Optional[str] = None
    profile_photo: Optional[str] = None
    is_available: bool


# ============================================================
# HELPERS
# ============================================================

def guide_response(guide: LocalGuide) -> dict:
    """Return public profile details without exposing phone numbers."""

    return {
        "id": guide.id,
        "full_name": guide.full_name,
        "location": guide.location,
        "places_covered": guide.places_covered or [],
        "price_per_day": float(guide.price_per_day),
        "languages": guide.languages or [],
        "experience": guide.experience,
        "about_me": guide.about_me,
        "profile_photo": guide.profile_photo,
        "is_available": guide.is_available,
    }


def get_my_guide(db: Session, user_id: int) -> Optional[LocalGuide]:
    return (
        db.query(LocalGuide)
        .filter(LocalGuide.user_id == user_id)
        .first()
    )


def save_guide(
    guide: LocalGuide,
    data: LocalGuideCreate,
) -> None:
    guide.full_name = data.full_name.strip()
    guide.phone = data.phone
    guide.location = data.location.strip()
    guide.places_covered = [
        place.strip()
        for place in data.places_covered
        if place.strip()
    ]
    guide.price_per_day = data.price_per_day
    guide.languages = [
        language.strip()
        for language in data.languages
        if language.strip()
    ]
    guide.experience = data.experience
    guide.about_me = data.about_me
    guide.profile_photo = data.profile_photo
    guide.is_available = data.is_available


# ============================================================
# GET ALL AVAILABLE GUIDES
# GET /local-guides
# ============================================================

@router.get("")
def get_available_guides(
    db: Session = Depends(get_db),
):
    guides = (
        db.query(LocalGuide)
        .filter(LocalGuide.is_available.is_(True))
        .order_by(LocalGuide.created_at.desc())
        .all()
    )

    return {
        "count": len(guides),
        "guides": [guide_response(guide) for guide in guides],
    }


# ============================================================
# GET ONE GUIDE
# GET /local-guides/{guide_id}
# ============================================================

@router.get("/{guide_id}")
def get_guide_details(
    guide_id: int,
    db: Session = Depends(get_db),
):
    guide = (
        db.query(LocalGuide)
        .filter(
            LocalGuide.id == guide_id,
            LocalGuide.is_available.is_(True),
        )
        .first()
    )

    if not guide:
        raise HTTPException(
            status_code=404,
            detail="Local guide not found",
        )

    return guide_response(guide)


# ============================================================
# GET MY GUIDE PROFILE
# GET /local-guides/me
# ============================================================

@router.get("/me/profile")
def get_my_guide_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    guide = get_my_guide(db, current_user.id)

    if not guide:
        return {"is_guide": False, "guide": None}

    return {
        "is_guide": True,
        "guide": {
            **guide_response(guide),
            "phone": guide.phone,
        },
    }


# ============================================================
# REGISTER AS A GUIDE
# POST /local-guides
# ============================================================

@router.post("", status_code=status.HTTP_201_CREATED)
def register_as_guide(
    data: LocalGuideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_guide = get_my_guide(db, current_user.id)

    if existing_guide:
        raise HTTPException(
            status_code=409,
            detail="You already have a guide profile. Update it instead.",
        )

    if not data.places_covered or not data.languages:
        raise HTTPException(
            status_code=400,
            detail="Add at least one place and one language.",
        )

    guide = LocalGuide(user_id=current_user.id)
    save_guide(guide, data)

    db.add(guide)

    try:
        db.commit()
        db.refresh(guide)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save your guide profile. Check the database schema.",
        )

    return {
        "message": "You are now registered as a local guide!",
        "guide": guide_response(guide),
    }


# ============================================================
# UPDATE MY GUIDE PROFILE
# PUT /local-guides/me
# ============================================================

@router.put("/me")
def update_my_guide_profile(
    data: LocalGuideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    guide = get_my_guide(db, current_user.id)

    if not guide:
        raise HTTPException(
            status_code=404,
            detail="You have not registered as a guide yet.",
        )

    save_guide(guide, data)

    try:
        db.commit()
        db.refresh(guide)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update your guide profile.",
        )

    return {
        "message": "Guide profile updated successfully.",
        "guide": guide_response(guide),
    }


# ============================================================
# DELETE MY GUIDE PROFILE
# DELETE /local-guides/me
# ============================================================

@router.delete("/me")
def delete_my_guide_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    guide = get_my_guide(db, current_user.id)

    if not guide:
        raise HTTPException(
            status_code=404,
            detail="You do not have a guide profile.",
        )

    db.delete(guide)
    db.commit()

    return {"message": "Your guide profile has been removed."}