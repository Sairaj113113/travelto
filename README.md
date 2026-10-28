# AI Tourism Portal

An AI-powered adaptive tourism platform with personalized trip planning, an AI travel agent, adaptive itinerary updates, budget management, travel-buddy and guide matching, group planning, what-if simulation, travel companion support, and AI travel memories.

## Stack
- Frontend: Next.js + React + Tailwind CSS (to be added)
- Backend: Python + FastAPI
- AI: Gemini/OpenAI + LangGraph/LangChain
- Database: PostgreSQL/Supabase
- Maps/Weather/Travel data: external APIs

## Run backend
```bash
cd backend
python -m venv .venv
# activate the environment
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Run frontend
```bash
cd frontend
npm install
npm run dev
```

This repository is a clean starter scaffold. API keys and real booking providers must be configured before production use.
