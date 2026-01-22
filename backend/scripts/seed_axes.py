from datetime import datetime
from sqlmodel import Session, select
from backend.core.db import engine
from backend.models.canonical import Question
from backend.services.ai_service import ai_service
import asyncio

async def seed_axes():
    """
    Scans all questions in DB.
    If thinking_axis is None, asks AI to classify it and updates the DB.
    """
    print("Starting AI Axis Seeding...")
    with Session(engine) as session:
        questions = session.exec(select(Question).where(Question.thinking_axis == None)).all()
        print(f"Found {len(questions)} unclassified questions.")
        
        for q in questions:
            print(f"Classifying: {q.content[:50]}...")
            try:
                axis = await ai_service.classify_question_axis(q.content)
                if axis:
                    q.thinking_axis = axis.value
                    session.add(q)
                    print(f" -> Assigned: {axis.value}")
                else:
                    print(f" -> Failed to classify (Fallback default used in service?).")
            except Exception as e:
                print(f" -> SKIPPING due to error: {e}")
            
            # Rate limit niceness
            await asyncio.sleep(4)
            
        session.commit()
    print("Seeding Complete.")

if __name__ == "__main__":
    asyncio.run(seed_axes())
