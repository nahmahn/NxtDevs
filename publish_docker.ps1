$ErrorActionPreference = "Stop"

# 1. Ask for Docker Hub Username
$username = Read-Host "Enter your Docker Hub username (e.g., nahmahn)"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "Username cannot be empty." -ForegroundColor Red
    exit 1
}

# 2. Check if logged in
Write-Host "`nchecking Docker login..." -ForegroundColor Cyan
try {
    docker login
} catch {
    Write-Host "Please log in to Docker Hub first." -ForegroundColor Yellow
    exit 1
}

# 3. Define images to push
$images = @("nxtdevs20-backend", "nxtdevs20-frontend", "nxtdevs20-worker")
$version = "latest" # or ask for version

foreach ($img in $images) {
    $localTag = "${img}:${version}"
    $remoteTag = "${username}/${img}:${version}"

    # 4. Tag
    Write-Host "`nTagging $localTag -> $remoteTag ..." -ForegroundColor Green
    docker tag $localTag $remoteTag

    # 5. Push
    Write-Host "Pushing $remoteTag ..." -ForegroundColor Green
    docker push $remoteTag
}

Write-Host "`n✅ All images pushed successfully!" -ForegroundColor Cyan
