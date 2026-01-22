from sqlmodel import SQLModel, create_engine, Session

import os
from dotenv import load_dotenv

from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
print(f"DEBUG: Loading env from {env_path}")
load_dotenv(dotenv_path=env_path)

# Manual fallback if load_dotenv fails
if not os.getenv("DATABASE_URL"):
    print("DEBUG: load_dotenv failed, trying manual parse...")
    try:
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("DATABASE_URL="):
                        os.environ["DATABASE_URL"] = line.split("=", 1)[1].strip()
                        print("DEBUG: Manually loaded DATABASE_URL")
                        break
        else:
            print(f"DEBUG: .env file not found at {env_path}")
    except Exception as e:
        print(f"DEBUG: Manual parse failed: {e}")

# Check for Postgres URL first (Supabase)
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: Loading DB. DATABASE_URL found: {bool(DATABASE_URL)}")
if DATABASE_URL:
    print(f"DEBUG: Using Postgres: {DATABASE_URL.split('@')[-1]}") # Hide password
    # Postgres
    # Enable pool_pre_ping to handle dropped connections (e.g. Supabase idle timeouts)
    # Ensure sslmode is required for cloud DBs
    engine = create_engine(
        DATABASE_URL, 
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"sslmode": "require"}
    )
else:
    # SQLite Fallback
    sqlite_file_name = "brainwave.db"
    sqlite_url = f"sqlite:///{sqlite_file_name}"
    engine = create_engine(sqlite_url, echo=False)

def create_db_and_tables():
    # Import models so their metadata is registered
    from backend.models import canonical, user_state, duel_models, report_models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
