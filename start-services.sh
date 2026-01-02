#!/bin/bash
# Bash script to start all microservices
# Run this from the project root directory
#
# This script:
# - Checks for required directories
# - Verifies ports are available
# - Installs dependencies if needed
# - Starts API Gateway (port 3000)
# - Starts Auth Service (port 3001)
# - Starts Reporting Service (port 3002)
# - Connects to Supabase (cloud service)

echo "========================================"
echo "  Starting Microservices"
echo "========================================"
echo ""

# Check if we're in the project root
if [ ! -d "services/api-gateway" ] || [ ! -d "services/auth-service" ] || [ ! -d "services/reporting-service" ]; then
    echo "Error: Please run this script from the project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || nc -z localhost $port 2>/dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if ports are already in use
echo "Checking ports..."
if check_port 3000; then
    echo "Warning: Port 3000 is already in use (API Gateway)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if check_port 3001; then
    echo "Warning: Port 3001 is already in use (Auth Service)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if check_port 3002; then
    echo "Warning: Port 3002 is already in use (Reporting Service)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check and install dependencies for API Gateway
echo ""
echo "Checking API Gateway dependencies..."
if [ ! -d "services/api-gateway/node_modules" ]; then
    echo "Installing API Gateway dependencies..."
    cd services/api-gateway
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install API Gateway dependencies"
        cd ../..
        exit 1
    fi
    cd ../..
else
    echo "API Gateway dependencies already installed"
fi

# Check and install dependencies for Auth Service
echo "Checking Auth Service dependencies..."
if [ ! -d "services/auth-service/node_modules" ]; then
    echo "Installing Auth Service dependencies..."
    cd services/auth-service
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install Auth Service dependencies"
        cd ../..
        exit 1
    fi
    cd ../..
else
    echo "Auth Service dependencies already installed"
fi

# Check and install dependencies for Reporting Service
echo "Checking Reporting Service dependencies..."
if [ ! -d "services/reporting-service/node_modules" ]; then
    echo "Installing Reporting Service dependencies..."
    cd services/reporting-service
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install Reporting Service dependencies"
        cd ../..
        exit 1
    fi
    cd ../..
else
    echo "Reporting Service dependencies already installed"
fi

echo ""
echo "========================================"
echo "  Starting Services"
echo "========================================"
echo ""

# Start API Gateway in background
echo "Starting API Gateway on port 3000..."
cd services/api-gateway
npm start > ../api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
cd ../..

# Wait a bit for API Gateway to start
sleep 3

# Start Auth Service in background
echo "Starting Auth Service on port 3001..."
cd services/auth-service
npm start > ../auth-service.log 2>&1 &
AUTH_SERVICE_PID=$!
cd ../..

# Wait a bit for Auth Service to start
sleep 2

# Start Reporting Service in background
echo "Starting Reporting Service on port 3002..."
cd services/reporting-service
npm start > ../reporting-service.log 2>&1 &
REPORTING_SERVICE_PID=$!
cd ../..

# Wait a bit for Reporting Service to start
sleep 2

# Check if services started successfully
if ! kill -0 $API_GATEWAY_PID 2>/dev/null; then
    echo "Error: API Gateway failed to start. Check services/api-gateway.log"
    exit 1
fi

if ! kill -0 $AUTH_SERVICE_PID 2>/dev/null; then
    echo "Error: Auth Service failed to start. Check services/auth-service.log"
    kill $API_GATEWAY_PID 2>/dev/null
    exit 1
fi

if ! kill -0 $REPORTING_SERVICE_PID 2>/dev/null; then
    echo "Error: Reporting Service failed to start. Check services/reporting-service.log"
    kill $API_GATEWAY_PID $AUTH_SERVICE_PID 2>/dev/null
    exit 1
fi

echo ""
echo "========================================"
echo "  Services Started!"
echo "========================================"
echo ""
echo "API Gateway:      http://localhost:3000"
echo "Auth Service:      http://localhost:3001"
echo "Reporting Service: http://localhost:3002"
echo ""
echo "Health Checks:"
echo "  - API Gateway:      http://localhost:3000/health"
echo "  - Auth Service:      http://localhost:3001/health"
echo "  - Reporting Service: http://localhost:3002/health"
echo ""
echo "Logs:"
echo "  - API Gateway:      tail -f services/api-gateway.log"
echo "  - Auth Service:      tail -f services/auth-service.log"
echo "  - Reporting Service: tail -f services/reporting-service.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $API_GATEWAY_PID $AUTH_SERVICE_PID $REPORTING_SERVICE_PID 2>/dev/null
    wait $API_GATEWAY_PID $AUTH_SERVICE_PID $REPORTING_SERVICE_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

# Wait for user interrupt
trap cleanup INT TERM
wait

