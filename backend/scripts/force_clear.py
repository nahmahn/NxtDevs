from sqlmodel import Session, text
from backend.core.db import engine

def force_clear():
    with Session(engine) as session:
        print("Clearing MatchmakingQueue...")
        session.exec(text("DELETE FROM matchmakingqueue"))
        
        print("Clearing DuelRound...")
        session.exec(text("DELETE FROM duelround"))
        
        print("Clearing DuelSession...")
        session.exec(text("DELETE FROM duelsession"))
        
        session.commit()
        print("Done!")

if __name__ == "__main__":
    force_clear()
