"""
Celery Application Configuration for Axiom
Handles background tasks like report generation and AI question generation.
"""
from celery import Celery
import os
from pathlib import Path
import sys
from dotenv import load_dotenv

# Add project root to Python path
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Load environment variables from backend/.env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Try .env in current directory
    load_dotenv()

# Build Redis URL from environment
redis_host = os.getenv("REDIS_HOST")
redis_port = os.getenv("REDIS_PORT", "6379")

# Prioritize HOST construction if exists (for Docker), otherwise check URL
if redis_host:
    redis_url = f'redis://{redis_host}:{redis_port}/0'
else:
    redis_url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"

# Initialize Celery app
app = Celery(
    'axiom_celery',
    broker=redis_url,
    backend=redis_url
)

# Celery configuration
app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
    task_always_eager=False,
    task_create_missing_queues=True,
    task_default_queue='default',
    task_default_exchange='default',
    task_default_routing_key='default',
    worker_prefetch_multiplier=1,  # Better for long-running tasks
    task_acks_late=True,  # Don't ack until task is complete
    task_reject_on_worker_lost=True,  # Better handling of worker failures
    # Result expiration
    result_expires=3600,  # Results expire after 1 hour
    # Task retry settings
    task_default_retry_delay=60,
    task_max_retries=3,
)


# Explicitly register task modules
app.conf.imports = [
    'backend.services.celery_tasks'
]

# Periodic Tasks (Celery Beat)
app.conf.beat_schedule = {
    'cleanup-stale-duels-every-15-mins': {
        'task': 'cleanup_stale_duels',
        'schedule': 900.0,  # 15 minutes
    },
}

@app.task(bind=True, name='test_task')
def test_task(self):
    """A simple test task to verify Celery is working."""
    print("Test task is working!")
    return {"status": "success", "message": "Axiom Celery test task completed!"}


if __name__ == '__main__':
    app.start()
