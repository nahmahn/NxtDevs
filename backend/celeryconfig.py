"""
Celery Configuration Settings for Axiom
"""
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Redis configuration
redis_host = os.getenv("REDIS_HOST")
redis_port = os.getenv("REDIS_PORT", "6379")
if redis_host:
    redis_url = f"redis://{redis_host}:{redis_port}/0"
else:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Broker settings
broker_url = os.getenv("CELERY_BROKER_URL", redis_url)
result_backend = os.getenv("CELERY_RESULT_BACKEND", redis_url)

# Task settings
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'UTC'
enable_utc = True

# Task queue settings
task_create_missing_queues = True
task_default_queue = 'default'

# Performance settings
worker_prefetch_multiplier = 1
task_acks_late = True
task_reject_on_worker_lost = True

# Result settings
result_expires = 3600  # 1 hour

# Retry settings
task_default_retry_delay = 60
task_max_retries = 3

# Task routes (optional - can route specific tasks to specific queues)
task_routes = {
    'generate_report': {'queue': 'reports'},
    'generate_questions': {'queue': 'ai'},
}
