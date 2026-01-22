from sqlmodel import Session, select
from backend.core.db import engine
from backend.models.duel_models import DuelSession, MatchmakingQueue

def clear_duels_and_queue():
    with Session(engine) as session:
        # Clear Queue
        queue_items = session.exec(select(MatchmakingQueue)).all()
        for item in queue_items:
            session.delete(item)
        
        # Clear Active Duels (optional, or just mark them completed)
        # For now, let's just delete them to be clean
        duels = session.exec(select(DuelSession)).all()
        for duel in duels:
            session.delete(duel)
            
        session.commit()
        print(f"Cleared {len(queue_items)} queue items and {len(duels)} duels.")

if __name__ == "__main__":
    clear_duels_and_queue()
