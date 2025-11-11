# Test script for database connectors (PowerShell)
# Usage: .\test_connectors.ps1

$ErrorActionPreference = "Stop"

$API_URL = "http://localhost:8000"
$TOKEN = ""

Write-Host "=== Testing Syntrabi Database Connectors ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register user
Write-Host "1. Registering test user..." -ForegroundColor Yellow
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$registerBody = @{
    email = "test_$timestamp@example.com"
    password = "testpass123"
    name = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
    $TOKEN = $response.access_token
    Write-Host "✅ User registered, token obtained" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to register user" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 2: Test PostgreSQL connection
Write-Host "2. Testing PostgreSQL connection..." -ForegroundColor Yellow
$pgBody = @{
    host = "postgres"
    port = 5432
    database = "syntra"
    username = "syntra"
    password = "syntra123"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$API_URL/api/datasets/connectors/test?connector_type=postgresql" -Method Post -Headers $headers -Body $pgBody

    if ($response.success -eq $true) {
        Write-Host "✅ PostgreSQL connection test PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL connection test FAILED" -ForegroundColor Red
        Write-Host ($response | ConvertTo-Json)
    }
} catch {
    Write-Host "❌ PostgreSQL connection test FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Step 3: Get PostgreSQL schema
Write-Host "3. Retrieving PostgreSQL schema..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/datasets/connectors/schema?connector_type=postgresql" -Method Post -Headers $headers -Body $pgBody

    if ($response.success -eq $true) {
        $tableCount = $response.schema.tables.Count
        Write-Host "✅ Schema retrieval PASSED - Found $tableCount tables" -ForegroundColor Green
    } else {
        Write-Host "❌ Schema retrieval FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Schema retrieval FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Step 4: Create workspace
Write-Host "4. Creating test workspace..." -ForegroundColor Yellow
$workspaceBody = @{
    name = "Test Workspace"
    description = "Automated test workspace"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/workspaces" -Method Post -Headers $headers -Body $workspaceBody
    $WORKSPACE_ID = $response.id
    Write-Host "✅ Workspace created: $WORKSPACE_ID" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create workspace" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

# Step 5: Test CSV upload (if file exists)
if (Test-Path "test_sales.csv") {
    Write-Host "5. Testing CSV upload..." -ForegroundColor Yellow

    try {
        $filePath = (Resolve-Path "test_sales.csv").Path
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)

        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"

        $bodyLines = (
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"test_sales.csv`"",
            "Content-Type: text/csv$LF",
            $fileContent,
            "--$boundary",
            "Content-Disposition: form-data; name=`"name`"$LF",
            "Test Sales Data",
            "--$boundary",
            "Content-Disposition: form-data; name=`"connector_type`"$LF",
            "csv",
            "--$boundary--$LF"
        ) -join $LF

        $uploadHeaders = @{
            "Authorization" = "Bearer $TOKEN"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }

        $response = Invoke-RestMethod -Uri "$API_URL/api/datasets/workspaces/$WORKSPACE_ID/datasets" -Method Post -Headers $uploadHeaders -Body $bodyLines

        if ($response.id) {
            Write-Host "✅ CSV upload PASSED" -ForegroundColor Green
        } else {
            Write-Host "⚠️  CSV upload may have issues" -ForegroundColor Yellow
            Write-Host ($response | ConvertTo-Json)
        }
    } catch {
        Write-Host "⚠️  CSV upload may have issues" -ForegroundColor Yellow
        Write-Host $_.Exception.Message
    }
} else {
    Write-Host "5. ⚠️  test_sales.csv not found, skipping CSV test" -ForegroundColor Yellow
    Write-Host "   Create test_sales.csv to test CSV upload functionality"
}
Write-Host ""

# Step 6: Get supported connectors
Write-Host "6. Getting list of supported connectors..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/datasets/connectors/types" -Method Get -Headers $headers
    $connectorCount = $response.connectors.Count
    Write-Host "✅ Found $connectorCount supported connector types" -ForegroundColor Green

    Write-Host "`nSupported connectors:" -ForegroundColor Cyan
    foreach ($connector in $response.connectors) {
        Write-Host "  - $($connector.name) ($($connector.type))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to get connector types" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
Write-Host ""

Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "All critical tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Your auth token for manual testing:" -ForegroundColor Yellow
Write-Host $TOKEN -ForegroundColor White
Write-Host ""
Write-Host "Your workspace ID:" -ForegroundColor Yellow
Write-Host $WORKSPACE_ID -ForegroundColor White
Write-Host ""
Write-Host "You can now use these values to test connectors manually!" -ForegroundColor Cyan
