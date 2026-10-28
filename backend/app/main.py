
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine

# Import models so SQLAlchemy registers their tables.
from app.models.user import User
from app.models.destination import Destination

from app.api.auth import router as auth_router
from app.api.destinations import router as destination_router
from app.api.trips import router as trip_router
from app.api.itinerary import router as itinerary_router
from app.api.ai_trip import router as ai_trip_router
from app.api.what_if import router as what_if_router
from app.api.media import router as media_router
from app.api.ai_agent import router as ai_agent_router
from app.api.ai_agent_chat import router as ai_agent_chat_router
from app.api.local_guides import router as local_guides_router


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

try:
    Base.metadata.create_all(bind=engine)
except Exception as exc:
    print(f"Database table initialization failed: {exc}")


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="AI Tourism Portal",
    version="1.0.0",
)


# =========================================================
# CORS CONFIGURATION
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# API ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(destination_router)
app.include_router(trip_router)
app.include_router(itinerary_router)
app.include_router(ai_trip_router)
app.include_router(what_if_router)
app.include_router(media_router)
app.include_router(ai_agent_router)
app.include_router(ai_agent_chat_router)
app.include_router(local_guides_router)


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to AI Tourism Portal API",
        "status": "running",
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "success",
        "message": "AI Tourism Portal backend is running",
    }
