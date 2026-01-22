from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.api import questions, duels, auth, tutor, reports
from backend.core.db import create_db_and_tables
from backend.core.cache import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    await cache.connect()
    yield
    # Shutdown
    await cache.disconnect()

app = FastAPI(title="Brainwave API", version="1.0.0", lifespan=lifespan)

# CORS for local dev (Next.js runs on 3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(questions.router, prefix="/api/v1")
app.include_router(duels.router, prefix="/api/v1")
app.include_router(tutor.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "system": "Matiks-Style Platform"}
