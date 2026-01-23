from sqlmodel import text, Session
from backend.core.db import engine

def migrate():
    with Session(engine) as session:
        print("Migrating schema...")
        
        # 1. Add leetcode_username to User table
        try:
            print("Adding leetcode_username to user table...")
            session.exec(text('ALTER TABLE "user" ADD COLUMN leetcode_username VARCHAR'))
            session.commit()
            print("User column added.")
        except Exception as e:
            print(f"Skipping user column add (might exist): {e}")
            session.rollback()

        # 2. Add recent_submissions to LeetCodeStats table
        try:
            print("Adding recent_submissions to leetcodestats table...")
            session.exec(text('ALTER TABLE "leetcodestats" ADD COLUMN recent_submissions JSON'))
            session.commit()
            print("recent_submissions column added.")
        except Exception as e:
            print(f"Skipping recent_submissions add: {e}")
            session.rollback()

        try:
            print("Adding tag_stats to leetcodestats table...")
            session.exec(text('ALTER TABLE "leetcodestats" ADD COLUMN tag_stats JSON'))
            session.commit()
            print("tag_stats column added.")
        except Exception as e:
            print(f"Skipping tag_stats add: {e}")
            session.rollback()

        try:
            print("Adding thinking_patterns to leetcodestats table...")
            session.exec(text('ALTER TABLE "leetcodestats" ADD COLUMN thinking_patterns JSON'))
            session.commit()
            print("thinking_patterns column added.")
        except Exception as e:
            print(f"Skipping thinking_patterns add: {e}")
            session.rollback()

        try:
            print("Adding submission_calendar to leetcodestats table...")
            session.exec(text('ALTER TABLE "leetcodestats" ADD COLUMN submission_calendar JSON'))
            session.commit()
            print("submission_calendar column added.")
        except Exception as e:
            print(f"Skipping submission_calendar add: {e}")
            session.rollback()

        try:
            print("Adding history to leetcodestats table...")
            session.exec(text('ALTER TABLE "leetcodestats" ADD COLUMN history JSON'))
            session.commit()
            print("history column added.")
        except Exception as e:
            print(f"Skipping history add: {e}")
            session.rollback()

        # 2. Create leetcodestats table
        # Since SQLModel create_db_and_tables handles new tables, we can just run that, 
        # BUT strictly speaking create_all might not pick it up if metadata is stale or logic differs.
        # Let's try explicit SQL for the new table just to be sure if create_all fails.
        # However, create_all IS the standard way for new tables.
        
        # Let's relying on create_db_and_tables for the NEW table, relying on this script only for the ALTER.
        pass

if __name__ == "__main__":
    migrate()
    from backend.core.db import create_db_and_tables
    print("Running create_db_and_tables for new tables...")
    create_db_and_tables()
    print("Migration complete.")
