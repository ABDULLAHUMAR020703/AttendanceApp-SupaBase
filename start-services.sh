#!/usr/bin/env bash
set -euo pipefail

# Local development only. Production uses docker-compose.yml through Coolify.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

services=(
  "services/api-gateway"
  "services/auth-service"
  "services/reporting-service"
)

for service in "${services[@]}"; do
  [[ -d "$service" ]] || { echo "Missing service: $service" >&2; exit 1; }
  if [[ ! -d "$service/node_modules" ]]; then
    echo "Installing dependencies for $service..."
    (cd "$service" && npm ci)
  fi
done

PIDS=()

cleanup() {
  local exit_code=$?
  trap - INT TERM EXIT
  if ((${#PIDS[@]})); then
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
  exit "$exit_code"
}
trap cleanup INT TERM EXIT

start_service() {
  local name=$1 directory=$2
  echo "Starting $name..."
  (cd "$directory" && exec npm start) >"services/${name}.log" 2>&1 &
  LAST_PID=$!
  PIDS+=("$LAST_PID")
}

wait_for_health() {
  local name=$1 port=$2 pid=$3
  for ((attempt = 1; attempt <= 30; attempt++)); do
    kill -0 "$pid" 2>/dev/null || {
      echo "$name exited. Check services/${name}.log" >&2
      return 1
    }
    if node -e "fetch('http://127.0.0.1:${port}/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
      echo "$name is healthy on port $port."
      return 0
    fi
    sleep 1
  done
  echo "$name health check timed out. Check services/${name}.log" >&2
  return 1
}

# Start private dependencies first.
start_service "auth-service" "services/auth-service"
AUTH_PID=$LAST_PID
start_service "reporting-service" "services/reporting-service"
REPORTING_PID=$LAST_PID
wait_for_health "auth-service" 3001 "$AUTH_PID"
wait_for_health "reporting-service" 3002 "$REPORTING_PID"

# Start the gateway only when its dependencies are ready.
start_service "gateway" "services/api-gateway"
GATEWAY_PID=$LAST_PID
wait_for_health "gateway" 3000 "$GATEWAY_PID"

echo "All services are healthy. Press Ctrl+C to stop."
wait
