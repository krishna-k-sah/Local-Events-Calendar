#!/bin/sh
# EventHub Container Healthcheck Script
# Dynamically checks the running Express health endpoint on the assigned PORT.

TARGET_PORT="${PORT:-5000}"
HEALTH_URL="http://127.0.0.1:${TARGET_PORT}/health"

wget --no-verbose --tries=1 --spider "$HEALTH_URL" 2>/dev/null
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  exit 0
else
  exit 1
fi
