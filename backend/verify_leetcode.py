import asyncio
from sqlmodel import Session, select
from backend.core.db import engine, create_db_and_tables
from backend.models.user_state import User
from backend.models.leetcode import LeetCodeStats
from backend.services.leetcode_service import leetcode_service

async def verify_backend():
    print("Setting up DB...")
    create_db_and_tables()
    
    with Session(engine) as session:
        # Create Dummy User
        username = "test_user_leetcode_verify"
        user = session.exec(select(User).where(User.username == username)).first()
        if not user:
            print(f"Creating test user: {username}")
            user = User(username=username, email="test@example.com")
            session.add(user)
            session.commit()
            session.refresh(user)
        
        print(f"User ID: {user.id}")
        
        # Test Sync Logic
        target_leetcode = "neal_wu" # Known public profile
        print(f"Testing sync for LeetCode user: {target_leetcode}")
        
        try:
            stats = await leetcode_service.sync_user_stats(session, user, target_leetcode)
            
            print("\n--- Sync Result ---")
            print(f"Total Solved: {stats.total_solved}")
            print(f"Ranking: {stats.ranking}")
            print(f"Patterns: {stats.thinking_patterns}")
            print(f"Tags: {list(stats.tag_stats.keys())[:3]}") # Show first few tags
            
            assert stats.total_solved > 0, "Total solved should be > 0"
            assert stats.thinking_patterns is not None, "Thinking patterns should be generated"
            
            print("\n✅ Verification SUCCESS: Backend logic is working.")
            
        except Exception as e:
            print(f"\n❌ Verification FAILED: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(verify_backend())
