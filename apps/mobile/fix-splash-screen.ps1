# Fix Splash Screen Logo Script
# This script clears caches and regenerates splash screen assets

Write-Host "Fixing Splash Screen Logo..." -ForegroundColor Cyan

# Step 1: Verify splash.png exists
Write-Host ""
Write-Host "[1/5] Verifying splash.png..." -ForegroundColor Yellow
if (Test-Path "assets\splash.png") {
    Write-Host "splash.png exists" -ForegroundColor Green
} else {
    Write-Host "splash.png not found!" -ForegroundColor Red
    exit 1
}

# Step 2: Remove old native splash screen assets
Write-Host ""
Write-Host "[2/5] Removing old native splash screen assets..." -ForegroundColor Yellow
$splashAssets = Get-ChildItem -Path "android\app\src\main\res" -Recurse -Filter "splashscreen_logo.png" -ErrorAction SilentlyContinue
if ($null -ne $splashAssets) {
    $count = ($splashAssets | Measure-Object).Count
    if ($count -gt 0) {
        $splashAssets | Remove-Item -Force
        Write-Host "Removed $count old splash screen assets" -ForegroundColor Green
    } else {
        Write-Host "No old splash assets found" -ForegroundColor Gray
    }
} else {
    Write-Host "No old splash assets found" -ForegroundColor Gray
}

# Step 3: Clear Expo cache
Write-Host ""
Write-Host "[3/5] Clearing Expo cache..." -ForegroundColor Yellow
if (Test-Path ".expo") {
    Remove-Item -Path ".expo" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cleared .expo cache" -ForegroundColor Green
} else {
    Write-Host "No .expo cache found" -ForegroundColor Gray
}

# Step 4: Clear Metro bundler cache
Write-Host ""
Write-Host "[4/5] Clearing Metro bundler cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cleared Metro cache" -ForegroundColor Green
} else {
    Write-Host "No Metro cache found" -ForegroundColor Gray
}

# Step 5: Instructions
Write-Host ""
Write-Host "[5/5] Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "To apply the splash screen fix:" -ForegroundColor Cyan
Write-Host "  1. Run: npx expo start --clear" -ForegroundColor White
Write-Host "  2. Close the app completely" -ForegroundColor White
Write-Host "  3. Reopen the app" -ForegroundColor White
Write-Host ""
Write-Host "For production builds, native assets will be auto-regenerated from splash.png" -ForegroundColor Cyan
Write-Host ""
Write-Host "Splash screen fix complete!" -ForegroundColor Green
