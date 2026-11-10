#!/usr/bin/env bash
# ==============================================================================
# Render Build Script for JobTrack API
#
# NOTE: Database migrations are intentionally NOT executed during this build
# script to avoid automatic, uncontrolled side-effects during image/asset build.
# Migrations must be run as a controlled release command or one-off shell task:
#   python manage.py migrate
# ==============================================================================

set -o errexit

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Collecting static files for WhiteNoise..."
python manage.py collectstatic --no-input

echo "==> Build completed successfully."
