from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.api import questions, duels, auth, tutor, reports, leetcode
from backend.core.db import create_db_and_tables
from backend.core.cache import cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    await cache.connect()
    
    # Start Background Scheduler for Stale Duels
    from apscheduler.schedulers.background import BackgroundScheduler
    from backend.core.db import engine
    from sqlalchemy import text
    
    def cleanup_stale_duels_job():
        try:
            with engine.connect() as connection:
                connection.begin()
                # Clean duels older than 1 hour or stuck in generic bad state
                result = connection.execute(text("""
                    UPDATE duelsession 
                    SET status = 'COMPLETED', ended_at = NOW() 
                    WHERE status IN ('IN_PROGRESS', 'COUNTDOWN') 
                    AND started_at < NOW() - INTERVAL '1 hour';
                """))
                if result.rowcount > 0:
                    print(f"[Scheduler] Cleaned up {result.rowcount} stale duels.")
                
                # Also clean matchmaking queue > 1 hour old (rare but possible)
                connection.execute(text("DELETE FROM matchmakingqueue WHERE joined_at < NOW() - INTERVAL '1 hour';"))
                connection.commit()
        except Exception as e:
            print(f"[Scheduler] Cleanup failed: {e}")

    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_stale_duels_job, 'interval', minutes=15)
    scheduler.start()
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    await cache.disconnect()

app = FastAPI(title="Brainwave API", version="1.0.0", lifespan=lifespan)

# CORS for local dev (Next.js runs on 3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://nxtdevs.app"
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
app.include_router(leetcode.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "system": "Matiks-Style Platform"}
