# build_and_save.ps1
$ErrorActionPreference = "Stop"

Write-Host "Building Backend..." -ForegroundColor Cyan
docker build -t nxtdevs20-backend:latest -f backend/Dockerfile .

Write-Host "Building Worker..." -ForegroundColor Cyan
docker build -t nxtdevs20-worker:latest -f backend/Dockerfile .

Write-Host "Building Frontend (Production)..." -ForegroundColor Cyan
docker build -t nxtdevs20-frontend:latest --build-arg NEXT_PUBLIC_API_URL=https://api.nxtdevs.app -f frontend/Dockerfile .

Write-Host "Saving images to nxtdevs20-images.tar..." -ForegroundColor Cyan
docker save -o nxtdevs20-images.tar nxtdevs20-backend:latest nxtdevs20-frontend:latest nxtdevs20-worker:latest

Write-Host "Done! Upload 'nxtdevs20-images.tar' to your server and run your deployment script." -ForegroundColor Green
