# PowerShell script to start all microservices
# Run this from the project root directory
# 
# This script:
# - Checks for required directories
# - Verifies ports are available
# - Installs dependencies if needed
# - Starts API Gateway (port 3000)
# - Starts Auth Service (port 3001)
# - Connects to Supabase (cloud service)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Microservices" -ForegroundColor Green
Write-Host "  (Supabase Backend)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "services\api-gateway") -or -not (Test-Path "services\auth-service")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Check if ports are already in use
Write-Host "Checking ports..." -ForegroundColor Yellow
if (Test-Port -Port 3000) {
    Write-Host "Warning: Port 3000 is already in use (API Gateway)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

if (Test-Port -Port 3001) {
    Write-Host "Warning: Port 3001 is already in use (Auth Service)" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check and install dependencies for API Gateway
Write-Host ""
Write-Host "Checking API Gateway dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "services\api-gateway\node_modules")) {
    Write-Host "Installing API Gateway dependencies..." -ForegroundColor Yellow
    Set-Location "services\api-gateway"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install API Gateway dependencies" -ForegroundColor Red
        Set-Location ..\..
        exit 1
    }
    Set-Location ..\..
} else {
    Write-Host "API Gateway dependencies already installed" -ForegroundColor Green
}

# Check and install dependencies for Auth Service
Write-Host "Checking Auth Service dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "services\auth-service\node_modules")) {
    Write-Host "Installing Auth Service dependencies..." -ForegroundColor Yellow
    Set-Location "services\auth-service"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install Auth Service dependencies" -ForegroundColor Red
        Set-Location ..\..
        exit 1
    }
    Set-Location ..\..
} else {
    Write-Host "Auth Service dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start API Gateway
Write-Host "Starting API Gateway on port 3000..." -ForegroundColor Yellow
$apiGatewayPath = (Resolve-Path "services\api-gateway").Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiGatewayPath'; Write-Host 'API Gateway starting...' -ForegroundColor Green; npm start" -WindowStyle Normal

# Wait a bit for API Gateway to start
Start-Sleep -Seconds 3

# Start Auth Service
Write-Host "Starting Auth Service on port 3001..." -ForegroundColor Yellow
$authServicePath = (Resolve-Path "services\auth-service").Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$authServicePath'; Write-Host 'Auth Service starting...' -ForegroundColor Green; npm start" -WindowStyle Normal

# Wait a bit for Auth Service to start
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend Services:" -ForegroundColor Yellow
Write-Host "  - API Gateway:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  - Auth Service: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Health Checks:" -ForegroundColor Yellow
Write-Host "  - API Gateway:  http://localhost:3000/health" -ForegroundColor White
Write-Host "  - Auth Service: http://localhost:3001/health" -ForegroundColor White
Write-Host ""
Write-Host "Supabase Connection:" -ForegroundColor Yellow
Write-Host "  - Supabase is a cloud service (no local server needed)" -ForegroundColor White
Write-Host "  - Backend services connect to Supabase automatically" -ForegroundColor White
Write-Host "  - Make sure SUPABASE_URL and keys are set in .env files" -ForegroundColor White
Write-Host ""
Write-Host "Environment Check:" -ForegroundColor Yellow
# Check if .env files exist
if (Test-Path "services\auth-service\.env") {
    Write-Host "  ✓ Auth Service .env found" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Auth Service .env missing - create it with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
}
if (Test-Path "apps\mobile\.env") {
    Write-Host "  ✓ Mobile App .env found" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Mobile App .env missing - create it with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "For Expo App:" -ForegroundColor Yellow
Write-Host "  - iOS Simulator: http://localhost:3000" -ForegroundColor White
Write-Host "  - Android Emulator: http://10.0.2.2:3000" -ForegroundColor White
Write-Host "  - Physical Device: http://<your-computer-ip>:3000" -ForegroundColor White
Write-Host ""
Write-Host "Note: Services are running in separate windows." -ForegroundColor Yellow
Write-Host "      Close those windows to stop the services." -ForegroundColor Yellow
Write-Host ""

