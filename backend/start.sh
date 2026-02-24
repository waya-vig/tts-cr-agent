#!/usr/bin/env bash

# Run database migrations (don't fail if DB is not ready yet)
echo "Running database migrations..."
alembic upgrade head || echo "WARNING: Migration failed, starting server anyway..."

# Start the application
echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
