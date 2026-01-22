# Use official Python 3.11 image
FROM python:3.11-slim

# Set working directory to /app
WORKDIR /app

# Install system dependencies
# gcc and libpq-dev are often needed for psycopg2 (Postgres)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the backend code
COPY backend /app/backend

# Set PYTHONPATH to /app so `backend` can be imported
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Default command
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
