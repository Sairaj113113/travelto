from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.destination import Destination
from app.schemas.destination import (
    DestinationCreate,
    DestinationResponse
)

router = APIRouter(
    prefix="/destinations",
    tags=["Destinations"]
)


@router.post("/", response_model=DestinationResponse)
def create_destination(
    data: DestinationCreate,
    db: Session = Depends(get_db)
):
    destination = Destination(
        name=data.name,
        city=data.city,
        state=data.state,
        category=data.category,
        description=data.description,
        image_url=data.image_url
    )

    db.add(destination)
    db.commit()
    db.refresh(destination)

    return destination


@router.get("/", response_model=list[DestinationResponse])
def get_destinations(
    city: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Destination)

    if city:
        query = query.filter(
            Destination.city.ilike(f"%{city}%")
        )

    if category:
        query = query.filter(
            Destination.category.ilike(f"%{category}%")
        )

    return query.all()


@router.get("/{destination_id}", response_model=DestinationResponse)
def get_destination(
    destination_id: int,
    db: Session = Depends(get_db)
):
    destination = (
        db.query(Destination)
        .filter(Destination.id == destination_id)
        .first()
    )

    if not destination:
        raise HTTPException(
            status_code=404,
            detail="Destination not found"
        )

    return destination