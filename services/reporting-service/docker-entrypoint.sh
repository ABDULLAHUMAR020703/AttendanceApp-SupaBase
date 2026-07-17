#!/bin/sh
set -eu

# Named volumes mount as root:root. Ensure the app user can write PDFs/index,
# then permanently drop privileges before starting Node.
mkdir -p /app/data/reports
chown -R app:app /app/data

exec su-exec app "$@"
