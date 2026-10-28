from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Trip(Base):

    __tablename__ = "trips"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    # ========================================================
    # USER
    # ========================================================

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # BASIC TRIP INFORMATION
    # ========================================================

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    destination: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    starting_location: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    # ========================================================
    # DATES
    # ========================================================

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    flexible_dates: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    # ========================================================
    # TRAVELERS
    # ========================================================

    travelers: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    adults: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    children: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    children_ages: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # ========================================================
    # BUDGET
    # ========================================================

    budget: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
    )

    budget_includes_transport: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    budget_includes_accommodation: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    budget_includes_food: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    budget_includes_activities: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    budget_includes_local_travel: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # ========================================================
    # TRANSPORT
    # ========================================================

    transport_preference: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    travel_mode: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    vehicle_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    fuel_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    mileage_kmpl: Mapped[float | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )

    rental_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    # ========================================================
    # PREFERENCES
    # ========================================================

    travel_style: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    priority: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="balanced",
    )

    interests: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ========================================================
    # STATUS
    # ========================================================

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        index=True,
    )

    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )