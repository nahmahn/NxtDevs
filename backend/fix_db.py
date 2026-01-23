import os
import sys
from sqlalchemy import create_engine, text

# Add current directory to path so we can import from backend if needed, 
# though here we just use the .env or hardcoded logic
sys.path.append(os.getcwd())

from backend.core.db import engine

def fix_and_verify():
    print(f"Connecting to DB: {engine.url}")
    
    with engine.connect() as connection:
        connection.begin()
        try:
            # 1. Check existing columns
            print("Checking existing columns in 'leetcodestats'...")
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='leetcodestats';"
            )).fetchall()
            columns = [row[0] for row in result]
            print(f"Found columns: {columns}")
            
            # 2. Add 'streak' if missing
            if 'streak' not in columns:
                print("⚠️ 'streak' column missing. Adding it...")
                connection.execute(text("ALTER TABLE leetcodestats ADD COLUMN streak INTEGER DEFAULT 0;"))
                print("✅ Added 'streak'.")
            else:
                print("✅ 'streak' column already exists.")

            # 3. Add 'streak_active' if missing
            if 'streak_active' not in columns:
                print("⚠️ 'streak_active' column missing. Adding it...")
                connection.execute(text("ALTER TABLE leetcodestats ADD COLUMN streak_active BOOLEAN DEFAULT FALSE;"))
                print("✅ Added 'streak_active'.")
            else:
                print("✅ 'streak_active' column already exists.")
                
            connection.commit()
            print("\n🎉 Database repair complete!")
            
        except Exception as e:
            connection.rollback()
            print(f"\n❌ FAILED: {e}")
            raise

if __name__ == "__main__":
    fix_and_verify()
