import sys
import os
from sqlalchemy import create_engine, text

# Add project root to path
sys.path.append(os.getcwd())

from backend.core.db import engine

def force_cleanup_raw():
    print("🔍 Connecting to DB (Raw SQL Mode)...")
    
    with engine.connect() as connection:
        connection.begin()
        try:
            # 1. Check/Clean Duels
            query_check_duels = text("SELECT id, started_at, status FROM duelsession WHERE status IN ('IN_PROGRESS', 'COUNTDOWN');")
            result_duels = connection.execute(query_check_duels).fetchall()
            
            print(f"Found {len(result_duels)} stuck duels.")
            for row in result_duels:
                print(f" - Duel {row[0]} Status: {row[2]}")
            
            if len(result_duels) > 0:
                print("Force closing duels...")
                query_update = text("""
                    UPDATE duelsession 
                    SET status = 'COMPLETED', 
                        winner_id = NULL,
                        ended_at = NOW() 
                    WHERE status IN ('IN_PROGRESS', 'COUNTDOWN');
                """)
                connection.execute(query_update)
                print("✅ Duels closed.")

            # 2. Check/Clean Queue
            query_check_queue = text("SELECT user_id, joined_at FROM matchmakingqueue;")
            result_queue = connection.execute(query_check_queue).fetchall()
            
            print(f"Found {len(result_queue)} users in matchmaking queue.")
            for row in result_queue:
                print(f" - User {row[0]} Joined: {row[1]}")
                
            if len(result_queue) > 0:
                print("Force clearing queue...")
                query_md = text("DELETE FROM matchmakingqueue;")
                connection.execute(query_md)
                print("✅ Queue cleared.")

            connection.commit()
            print("Done. All states reset.")
            
        except Exception as e:
            connection.rollback()
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    force_cleanup_raw()
