import sys
import os
from sqlalchemy import text

# Add project root to path
sys.path.append(os.getcwd())

from backend.core.db import engine

TARGET_USER_ID = "156f6d11-0e0b-448e-9104-afb16afdca13"

def delete_user_by_id(user_id):
    print(f"🔍 Deleting User {user_id} and all related data...")
    
    with engine.connect() as connection:
        connection.begin()
        try:
            # 1. LeetCode Stats
            connection.execute(text(f"DELETE FROM leetcodestats WHERE user_id = '{user_id}';"))
            print(" - Deleted LeetCode stats")

            # 2. Thinking Profile
            connection.execute(text(f"DELETE FROM thinkingprofile WHERE user_id = '{user_id}';"))
            print(" - Deleted Thinking Profile")
            
            # 3. Matchmaking Queue
            connection.execute(text(f"DELETE FROM matchmakingqueue WHERE user_id = '{user_id}';"))
            print(" - Deleted from Matchmaking Queue")

            # 4. Attempts
            connection.execute(text(f"DELETE FROM attempt WHERE user_id = '{user_id}';"))
            print(" - Deleted Attempts")

            # 5. Rating History
            connection.execute(text(f"DELETE FROM ratinghistory WHERE user_id = '{user_id}';"))
            print(" - Deleted Rating History")
            
            # 5.5 User Reports
            connection.execute(text(f"DELETE FROM userreport WHERE user_id = '{user_id}';"))
            print(" - Deleted User Reports")

            # 6. Duels (This is tricky, we might just set their ID to null or delete the duel if it's active)
            # Let's delete duels where they are a player
            connection.execute(text(f"DELETE FROM duelround WHERE duel_id IN (SELECT id FROM duelsession WHERE player1_id = '{user_id}' OR player2_id = '{user_id}');"))
            connection.execute(text(f"DELETE FROM duelsession WHERE player1_id = '{user_id}' OR player2_id = '{user_id}';"))
            print(" - Deleted associated Duels")

            # 7. Finally, the User
            result = connection.execute(text(f"DELETE FROM \"user\" WHERE id = '{user_id}';"))
            
            if result.rowcount > 0:
                print(f"✅ Successfully deleted User {user_id}.")
            else:
                print(f"⚠️ User {user_id} not found.")
                
            connection.commit()
            
        except Exception as e:
            connection.rollback()
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    delete_user_by_id(TARGET_USER_ID)
