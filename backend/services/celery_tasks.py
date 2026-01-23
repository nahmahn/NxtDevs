"""
Celery Tasks for Axiom
Background tasks for report generation and AI operations.
Ported from NxtDevs celery_tasks.py.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
import json

# Add project root to Python path
project_root = str(Path(__file__).parent.parent.parent.absolute())
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from celery.utils.log import get_task_logger

# Import the shared Celery app
from backend.celery_app import app

# SQLModel imports
from sqlmodel import Session, select
from backend.core.db import engine
from backend.models.report_models import UserReport, ReportStatus
from backend.models.user_state import User, Attempt
from backend.models.canonical import Question

logger = get_task_logger(__name__)


def get_db_session() -> Session:
    """Create a new database session."""
    return Session(engine)


def calculate_topic_stats(attempts: List[Attempt]) -> Dict[str, Any]:
    """Calculate performance statistics by topic."""
    stats: Dict[str, Dict[str, int]] = {}
    
    for attempt in attempts:
        # Get topic from question if available
        topic = "General"
        if hasattr(attempt, 'question') and attempt.question:
            topic = getattr(attempt.question, 'topic', None) or \
                    getattr(attempt.question, 'question_type', 'General')
        
        if topic not in stats:
            stats[topic] = {'correct': 0, 'total': 0, 'time_total': 0}
        
        stats[topic]['total'] += 1
        stats[topic]['time_total'] += attempt.time_taken_ms or 0
        
        if attempt.is_correct:
            stats[topic]['correct'] += 1
    
    # Calculate percentages
    result = {}
    for topic, data in stats.items():
        accuracy = (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
        avg_time = (data['time_total'] / data['total'] / 1000) if data['total'] > 0 else 0  # Convert to seconds
        
        result[topic] = {
            'accuracy': round(accuracy, 1),
            'total_questions': data['total'],
            'correct_answers': data['correct'],
            'average_time_seconds': round(avg_time, 1),
            'trend': 'stable'  # Placeholder - would need historical data
        }
    
    return result


def calculate_difficulty_stats(attempts: List[Attempt]) -> Dict[str, Any]:
    """Calculate performance statistics by difficulty level."""
    stats: Dict[str, Dict[str, int]] = {}
    
    for attempt in attempts:
        # Get difficulty from question
        difficulty = "Medium"
        if hasattr(attempt, 'question') and attempt.question:
            difficulty = getattr(attempt.question, 'difficulty', None) or \
                        str(getattr(attempt.question, 'difficulty_tier', 2))
        
        # Normalize difficulty tier to text
        if difficulty in ['1', '2', '3']:
            difficulty = {'1': 'Easy', '2': 'Medium', '3': 'Hard'}.get(difficulty, 'Medium')
        
        if difficulty not in stats:
            stats[difficulty] = {'correct': 0, 'total': 0}
        
        stats[difficulty]['total'] += 1
        if attempt.is_correct:
            stats[difficulty]['correct'] += 1
    
    result = {}
    for diff, data in stats.items():
        accuracy = (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
        result[diff] = {
            'accuracy': round(accuracy, 1),
            'total_questions': data['total'],
            'correct_answers': data['correct']
        }
    
    return result


def generate_ai_insights(topic_stats: Dict, difficulty_stats: Dict) -> Dict[str, Any]:
    """
    Generate AI-powered insights for the report using LLM.
    Uses asyncio.run() to bridge sync Celery task with async AI service.
    """
    import asyncio
    from backend.services.ai_service import ai_service
    
    # Calculate fallback overall accuracy for reference
    total_accuracy = sum(d['accuracy'] * d['total_questions'] for d in topic_stats.values())
    total_questions = sum(d['total_questions'] for d in topic_stats.values())
    fallback_overall = (total_accuracy / total_questions) if total_questions > 0 else 0
    
    try:
        # Debug: Check environment
        print(f"[CELERY DEBUG] Generating AI insights for {len(topic_stats)} topics")
        print(f"[CELERY DEBUG] Groq Client Status: {'Ready' if ai_service.groq_client else 'None'}")
        
        # Run async generation synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        insights = loop.run_until_complete(ai_service.generate_report_insights(topic_stats, difficulty_stats))
        loop.close()
        
        print("[CELERY DEBUG] AI insights generated successfully")
        
        # Ensure timestamp is added
        insights['generated_at'] = datetime.utcnow().isoformat()
        
        # If overall_accuracy wasn't generated or is 0 (fallback), use calculated
        if insights.get('overall_accuracy', 0) == 0:
            insights['overall_accuracy'] = round(fallback_overall, 1)
            
        return insights
        
    except Exception as e:
        import traceback
        print(f"[CELERY ERROR] Failed to generate AI insights: {e}")
        traceback.print_exc()
        logger.error(f"Error generating AI insights: {e}")
        
        # Fallback to basic logic if LLM completely fails
        return {
            'overall_assessment': "AI analysis unavailable. Continue practicing to generate more data.",
            'overall_accuracy': round(fallback_overall, 1),
            'strengths': [],
            'weaknesses': [],
            'recommendations': ["Practice consistently."],
            'generated_at': datetime.utcnow().isoformat()
        }


def _generate_report_sync(user_id: str, report_id: str, db: Session) -> Dict[str, Any]:
    """
    Synchronous report generation function.
    Called by the Celery task.
    
    Args:
        user_id: User UUID as string
        report_id: Report UUID as string
        db: Database session
        
    Returns:
        Generated report data dictionary
    """
    from uuid import UUID
    
    user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    report_uuid = UUID(report_id) if isinstance(report_id, str) else report_id
    
    # Fetch user attempts with questions
    statement = select(Attempt).where(Attempt.user_id == user_uuid).order_by(Attempt.timestamp.desc()).limit(500)
    attempts = db.exec(statement).all()
    
    # For each attempt, load the question
    for attempt in attempts:
        q_statement = select(Question).where(Question.id == attempt.question_id)
        attempt.question = db.exec(q_statement).first()
    
    # Calculate statistics
    topic_stats = calculate_topic_stats(attempts)
    difficulty_stats = calculate_difficulty_stats(attempts)
    ai_insights = generate_ai_insights(topic_stats, difficulty_stats)
    
    # Build report data
    report_data = {
        'user_id': str(user_uuid),
        'generated_at': datetime.utcnow().isoformat(),
        'period': {
            'start': attempts[-1].timestamp.isoformat() if attempts else None,
            'end': attempts[0].timestamp.isoformat() if attempts else None,
            'total_attempts': len(attempts)
        },
        'topic_performance': topic_stats,
        'difficulty_performance': difficulty_stats,
        'insights': ai_insights,
        'charts': {
            'accuracy_trend': _generate_accuracy_trend_data(attempts),
            'topic_radar': list(topic_stats.keys()),
            'topic_scores': [data['accuracy'] for data in topic_stats.values()]
        }
    }
    
    # Update report in database
    report = db.get(UserReport, report_uuid)
    if report:
        report.report_data = report_data
        report.updated_at = datetime.utcnow()
        db.add(report)
        db.commit()
    
    return report_data


def _generate_accuracy_trend_data(attempts: List[Attempt]) -> List[Dict[str, Any]]:
    """Generate data points for accuracy trend chart."""
    if not attempts:
        return []
    
    # Group by day
    daily_stats: Dict[str, Dict[str, int]] = {}
    
    for attempt in attempts:
        day = attempt.timestamp.strftime('%Y-%m-%d')
        if day not in daily_stats:
            daily_stats[day] = {'correct': 0, 'total': 0}
        daily_stats[day]['total'] += 1
        if attempt.is_correct:
            daily_stats[day]['correct'] += 1
    
    # Convert to list sorted by date
    trend_data = []
    for day in sorted(daily_stats.keys()):
        data = daily_stats[day]
        accuracy = (data['correct'] / data['total'] * 100) if data['total'] > 0 else 0
        trend_data.append({
            'date': day,
            'accuracy': round(accuracy, 1),
            'questions': data['total']
        })
    
    return trend_data[-30:]  # Last 30 days


@app.task(bind=True, max_retries=3, default_retry_delay=60, name='generate_report')
def generate_report_task(self, user_id: str, report_id: str):
    """
    Celery task for asynchronous report generation.
    
    Args:
        user_id: User UUID as string
        report_id: Report UUID as string
    """
    logger.info(f"Starting report generation for user {user_id}, report {report_id}")
    
    db = get_db_session()
    try:
        from uuid import UUID
        report_uuid = UUID(report_id) if isinstance(report_id, str) else report_id
        
        # Update status to GENERATING
        report = db.get(UserReport, report_uuid)
        if not report:
            error_msg = f"Report {report_id} not found"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        report.status = ReportStatus.GENERATING.value
        report.updated_at = datetime.utcnow()
        db.add(report)
        db.commit()
        
        # Generate report
        _generate_report_sync(user_id, report_id, db)
        
        # Update status to GENERATED
        report = db.get(UserReport, report_uuid)
        if report:
            report.status = ReportStatus.GENERATED.value
            report.updated_at = datetime.utcnow()
            db.add(report)
            db.commit()
        
        logger.info(f"Successfully generated report {report_id} for user {user_id}")
        return {"status": "success", "report_id": report_id}
        
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        # Update status to FAILED
        try:
            from uuid import UUID
            report_uuid = UUID(report_id) if isinstance(report_id, str) else report_id
            report = db.get(UserReport, report_uuid)
            if report:
                report.status = ReportStatus.FAILED.value
                report.error_message = str(e)
                report.updated_at = datetime.utcnow()
                db.add(report)
                db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update report status: {db_error}")
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        
    finally:
        db.close()


@app.task(name='generate_questions_batch')
def generate_questions_batch_task(language: str, topic: str, difficulty: str, count: int = 5):
    """
    Celery task to generate a batch of questions using AI.
    
    Args:
        language: Programming language
        topic: Topic area
        difficulty: Difficulty level
        count: Number of questions to generate
    """
    logger.info(f"Generating {count} {difficulty} questions for {language}/{topic}")
    
    # TODO: Implement AI question generation
    # This would use the prompts.yaml templates and ai_service
    
    return {"status": "success", "count": count}


@app.task(name='cleanup_stale_duels')
def cleanup_stale_duels_task():
    """
    Periodic task to clean up duels that have been stuck in IN_PROGRESS
    for too long (e.g., due to server restart or bugs).
    """
    logger.info("Running stale duel cleanup...")
    
    db = get_db_session()
    try:
        from backend.models.duel_models import DuelSession, DuelStatus
        from datetime import datetime, timedelta
        
        # Time threshold (1 hour ago)
        threshold = datetime.utcnow() - timedelta(hours=1)
        
        # Find stuck duels
        # We look for IN_PROGRESS or COUNTDOWN that started > 1 hour ago
        # Note: started_at can be None if it never started, but status checks cover it
        stuck_duels = db.exec(
            select(DuelSession).where(
                (DuelSession.status == DuelStatus.IN_PROGRESS) | 
                (DuelSession.status == DuelStatus.COUNTDOWN)
            ).where(DuelSession.started_at < threshold)
        ).all()
        
        if not stuck_duels:
            logger.info("No stale duels found.")
            return {"count": 0}
            
        logger.warning(f"Found {len(stuck_duels)} stale duels. Cleaning up...")
        
        for duel in stuck_duels:
            logger.info(f"Marking duel {duel.id} as COMPLETED/ABANDONED (started: {duel.started_at})")
            
            # Close it as a draw with no rating change
            duel.status = DuelStatus.COMPLETED 
            duel.ended_at = datetime.utcnow()
            duel.winner_id = None
            duel.player1_rating_delta = 0.0
            duel.player2_rating_delta = 0.0
            
            db.add(duel)
            
        db.commit()
        return {"count": len(stuck_duels)}
        
    except Exception as e:
        logger.error(f"Error cleaning up duels: {e}")
        return {"error": str(e)}
    finally:
        db.close()
