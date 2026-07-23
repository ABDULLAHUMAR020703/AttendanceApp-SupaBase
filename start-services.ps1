$ErrorActionPreference = "Stop"

# Local development only. Production uses docker-compose.yml through Coolify.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$services = @(
    "services\api-gateway",
    "services\auth-service",
    "services\reporting-service"
)

foreach ($service in $services) {
    if (-not (Test-Path $service -PathType Container)) {
        throw "Missing service: $service"
    }
    if (-not (Test-Path "$service\node_modules" -PathType Container)) {
        Write-Host "Installing dependencies for $service..."
        Push-Location $service
        try {
            npm ci
            if ($LASTEXITCODE -ne 0) { throw "npm ci failed for $service" }
        }
        finally {
            Pop-Location
        }
    }
}

function Start-LocalService {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Directory
    )
    $path = (Resolve-Path $Directory).Path
    Write-Host "Starting $Name..." -ForegroundColor Yellow
    Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", "Set-Location '$path'; npm start" `
        -WindowStyle Normal `
        -PassThru
}

function Wait-ServiceHealth {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][int]$Port,
        [Parameter(Mandatory)][System.Diagnostics.Process]$Process
    )
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        if ($Process.HasExited) { throw "$Name exited before becoming healthy." }
        try {
            $response = Invoke-WebRequest `
                -Uri "http://127.0.0.1:$Port/health" `
                -UseBasicParsing `
                -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Host "$Name is healthy on port $Port." -ForegroundColor Green
                return
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "$Name health check timed out."
}

$started = @()
try {
    # Start private dependencies first.
    $auth = Start-LocalService "auth-service" "services\auth-service"
    $started += $auth
    $reporting = Start-LocalService "reporting-service" "services\reporting-service"
    $started += $reporting
    Wait-ServiceHealth "auth-service" 3001 $auth
    Wait-ServiceHealth "reporting-service" 3002 $reporting

    # Start the gateway only when its dependencies are ready.
    $gateway = Start-LocalService "gateway" "services\api-gateway"
    $started += $gateway
    Wait-ServiceHealth "gateway" 3000 $gateway
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    foreach ($process in $started) {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
    exit 1
}

Write-Host ""
Write-Host "All backend services are healthy:" -ForegroundColor Green
Write-Host "  API Gateway:       http://localhost:3000"
Write-Host "  Auth Service:      http://localhost:3001"
Write-Host "  Reporting Service: http://localhost:3002"
Write-Host "Close the service windows to stop them."
