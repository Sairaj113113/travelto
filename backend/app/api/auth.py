import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import cachecontrol
import requests

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.database import get_db
from app.core.config import settings

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

from app.models.user import User

from app.schemas.user import (
    UserCreate,
    UserResponse,
)

from app.schemas.google import GoogleAuthRequest

from app.services.email_service import send_otp_email


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================
# GOOGLE REQUEST WITH CERTIFICATE CACHE
# ============================================================

_cached_session = cachecontrol.CacheControl(
    requests.session()
)

google_request = google_requests.Request(
    session=_cached_session
)


# ============================================================
# OTP SETTINGS
# ============================================================

OTP_EXPIRY_MINUTES = 10

MAX_OTP_ATTEMPTS = 5


# ============================================================
# OTP HELPERS
# ============================================================

def generate_otp() -> str:
    """
    Generate a secure 6-digit OTP.
    """

    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp: str) -> str:
    """
    Hash OTP before storing it in database.
    """

    return hashlib.sha256(
        otp.encode("utf-8")
    ).hexdigest()


def create_and_store_otp(
    user: User
) -> str:
    """
    Generate OTP and store its hash + expiry
    on the user object.
    """

    otp = generate_otp()

    user.otp_hash = hash_otp(otp)

    user.otp_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=OTP_EXPIRY_MINUTES
        )
    )

    user.otp_attempts = 0

    return otp


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):

    email = user_data.email.strip().lower()

    # --------------------------------------------------------
    # Check existing user
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:

        # Existing but not verified
        if not existing_user.email_verified:

            otp = create_and_store_otp(
                existing_user
            )

            db.commit()

            try:

                send_otp_email(
                    email,
                    otp
                )

            except Exception as e:

                print(
                    "OTP email error:",
                    repr(e)
                )

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Could not send verification email. "
                        "Please try resend OTP."
                    )
                )

            return existing_user

        # Existing and verified

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # --------------------------------------------------------
    # Create local account
    # --------------------------------------------------------

    hashed_password = hash_password(
        user_data.password
    )

    new_user = User(
        name=user_data.name.strip(),
        email=email,
        password_hash=hashed_password,
        email_verified=False,
        auth_provider="local"
    )

    # --------------------------------------------------------
    # Generate OTP
    # --------------------------------------------------------

    otp = create_and_store_otp(
        new_user
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    # --------------------------------------------------------
    # Send OTP email
    # --------------------------------------------------------

    try:

        send_otp_email(
            email,
            otp
        )

    except Exception as e:

        print(
            "OTP email error:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Account created, but verification email "
                "could not be sent. Please use resend OTP."
            )
        )

    return new_user


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login_user(
    user_data: dict,
    db: Session = Depends(get_db)
):

    email = user_data.get("email")
    password = user_data.get("password")

    if not email or not password:

        raise HTTPException(
            status_code=400,
            detail="Email and password are required"
        )

    email = email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # --------------------------------------------------------
    # Google account
    # --------------------------------------------------------

    if user.auth_provider == "google":

        raise HTTPException(
            status_code=400,
            detail=(
                "This account uses Google login. "
                "Please continue with Google."
            )
        )

    # --------------------------------------------------------
    # Email verification
    # --------------------------------------------------------

    if not user.email_verified:

        raise HTTPException(
            status_code=403,
            detail=(
                "Please verify your email "
                "before logging in."
            )
        )

    # --------------------------------------------------------
    # Password
    # --------------------------------------------------------

    if not user.password_hash:

        raise HTTPException(
            status_code=401,
            detail=(
                "Password login is not available "
                "for this account."
            )
        )

    if not verify_password(
        password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # --------------------------------------------------------
    # JWT
    # --------------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id)
        }
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ============================================================
# VERIFY OTP
# ============================================================

@router.post("/verify-otp")
def verify_otp(
    data: dict,
    db: Session = Depends(get_db)
):

    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:

        raise HTTPException(
            status_code=400,
            detail="Email and OTP are required"
        )

    email = email.strip().lower()
    otp = str(otp).strip()

    # --------------------------------------------------------
    # Validate OTP format
    # --------------------------------------------------------

    if not otp.isdigit() or len(otp) != 6:

        raise HTTPException(
            status_code=400,
            detail="OTP must be a 6-digit code"
        )

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # --------------------------------------------------------
    # Already verified
    # --------------------------------------------------------

    if user.email_verified:

        raise HTTPException(
            status_code=400,
            detail="Email is already verified"
        )

    # --------------------------------------------------------
    # Check OTP exists
    # --------------------------------------------------------

    if not user.otp_hash:

        raise HTTPException(
            status_code=400,
            detail=(
                "No verification code found. "
                "Please request a new code."
            )
        )

    # --------------------------------------------------------
    # Check expiry exists
    # --------------------------------------------------------

    if not user.otp_expires_at:

        raise HTTPException(
            status_code=400,
            detail=(
                "Verification code has expired. "
                "Please request a new code."
            )
        )

    # --------------------------------------------------------
    # Check attempts
    # --------------------------------------------------------

    if user.otp_attempts >= MAX_OTP_ATTEMPTS:

        raise HTTPException(
            status_code=429,
            detail=(
                "Too many incorrect attempts. "
                "Please request a new code."
            )
        )

    # --------------------------------------------------------
    # Check expiry
    # --------------------------------------------------------

    now = datetime.now(timezone.utc)

    if now > user.otp_expires_at:

        raise HTTPException(
            status_code=400,
            detail=(
                "Verification code has expired. "
                "Please request a new code."
            )
        )

    # --------------------------------------------------------
    # Compare OTP
    # --------------------------------------------------------

    if hash_otp(otp) != user.otp_hash:

        user.otp_attempts += 1

        db.commit()

        remaining = (
            MAX_OTP_ATTEMPTS
            - user.otp_attempts
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid verification code. "
                f"{remaining} attempts remaining."
            )
        )

    # ========================================================
    # OTP CORRECT
    # ========================================================

    user.email_verified = True

    user.otp_hash = None

    user.otp_expires_at = None

    user.otp_attempts = 0

    db.commit()

    db.refresh(user)

    # ========================================================
    # CREATE LOGIN SESSION
    # ========================================================

    access_token = create_access_token(
        data={
            "sub": str(user.id)
        }
    )

    # ========================================================
    # RETURN JWT + USER
    # ========================================================

    return {
        "message": "Email verified successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ============================================================
# RESEND OTP
# ============================================================

@router.post("/resend-otp")
def resend_otp(
    data: dict,
    db: Session = Depends(get_db)
):

    email = data.get("email")

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required"
        )

    email = email.strip().lower()

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # --------------------------------------------------------
    # Already verified
    # --------------------------------------------------------

    if user.email_verified:

        raise HTTPException(
            status_code=400,
            detail="Email is already verified"
        )

    # --------------------------------------------------------
    # Generate new OTP
    # --------------------------------------------------------

    otp = create_and_store_otp(
        user
    )

    db.commit()

    # --------------------------------------------------------
    # Send email
    # --------------------------------------------------------

    try:

        send_otp_email(
            email,
            otp
        )

    except Exception as e:

        print(
            "OTP resend email error:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not send verification email."
            )
        )

    return {
        "message": (
            "A new verification code "
            "has been sent"
        )
    }


# ============================================================
# GOOGLE LOGIN
# ============================================================

@router.post("/google")
def google_login(
    data: GoogleAuthRequest,
    db: Session = Depends(get_db)
):

    try:

        google_user = id_token.verify_oauth2_token(
            data.credential,
            google_request,
            settings.google_client_id
        )

    except Exception as e:

        print(
            "Google token verification error:",
            repr(e)
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid Google credential"
        )

    google_id = google_user.get("sub")

    email = google_user.get("email")

    name = (
        google_user.get("name")
        or "Travelto User"
    )

    email_verified = google_user.get(
        "email_verified",
        False
    )

    # --------------------------------------------------------
    # Validate Google information
    # --------------------------------------------------------

    if not google_id or not email:

        raise HTTPException(
            status_code=400,
            detail=(
                "Google account information "
                "is incomplete"
            )
        )

    if not email_verified:

        raise HTTPException(
            status_code=400,
            detail=(
                "Google email is not verified"
            )
        )

    email = email.strip().lower()

    # --------------------------------------------------------
    # Find by Google ID
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.google_id == google_id
        )
        .first()
    )

    # --------------------------------------------------------
    # If not found, find by email
    # --------------------------------------------------------

    if not user:

        user = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

    # --------------------------------------------------------
    # Existing account
    # --------------------------------------------------------

    if user:

        user.google_id = google_id

        user.email_verified = True

        user.auth_provider = "google"

        # Google account does not need
        # a local password.

        user.password_hash = None

        db.commit()

        db.refresh(user)

    # --------------------------------------------------------
    # New Google account
    # --------------------------------------------------------

    else:

        user = User(
            name=name,
            email=email,
            password_hash=None,
            email_verified=True,
            google_id=google_id,
            auth_provider="google"
        )

        db.add(user)

        db.commit()

        db.refresh(user)

    # --------------------------------------------------------
    # Create JWT
    # --------------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id)
        }
    )

    return {
        "message": "Google login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(
        get_current_user
    )
):

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }