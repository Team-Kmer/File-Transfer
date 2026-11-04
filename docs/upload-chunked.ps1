# Manual test for FT-41: init, raw chunks, status, resume.
# Usage: powershell -ExecutionPolicy Bypass -File .\docs\upload-chunked.ps1 -File .\docs\demo.mp4 -Skip 1
param(
    [Parameter(Mandatory = $true)] [string] $File,
    [int[]] $Skip = @()
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$baseUrl = "http://localhost:8080"
$api = "$baseUrl/api/files/upload"
$fileInfo = Get-Item -LiteralPath $File

function Get-Missing($status) {
    $received = @($status.receivedIndexes)
    @(0..($status.totalChunks - 1) | Where-Object { $received -notcontains $_ })
}

function Show-Status($status) {
    Write-Host ("Status: {0} | received [{1}] of {2} | missing: [{3}]" -f `
        $status.status, (@($status.receivedIndexes) -join ", "), $status.totalChunks, ((Get-Missing $status) -join ", "))
}

function Send-Chunk([int] $index) {
    $stream.Position = [long] $index * $chunkSize
    $read = 0
    while ($read -lt $chunkSize) {
        $count = $stream.Read($buffer, $read, $chunkSize - $read)
        if ($count -eq 0) { break }
        $read += $count
    }

    $content = [System.Net.Http.ByteArrayContent]::new($buffer, 0, $read)
    $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("application/octet-stream")

    $response = $client.PutAsync("$api/$uploadId/chunks/$index", $content).Result
    $body = $response.Content.ReadAsStringAsync().Result
    if (-not $response.IsSuccessStatusCode) {
        throw "Chunk $index rejected with HTTP $([int] $response.StatusCode): $body"
    }
    $result = $body | ConvertFrom-Json
    Write-Host ("Chunk {0} sent -> {1}/{2} received, status {3}" -f $index, $result.receivedChunks, $result.totalChunks, $result.status)
}

# An upload always belongs to a room
$room = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/rooms"

$initBody = @{
    filename  = $fileInfo.Name
    sizeBytes = $fileInfo.Length
    mimeType  = "application/octet-stream"
    roomCode  = $room.code
} | ConvertTo-Json
$init = Invoke-RestMethod -Method Post -Uri "$api/init" -ContentType "application/json" -Body $initBody
$uploadId = $init.uploadId
$chunkSize = [int] $init.chunkSize
Write-Host "Upload ${uploadId}: $($init.totalChunks) chunk(s) of $chunkSize bytes"

$client = [System.Net.Http.HttpClient]::new()
$stream = [System.IO.File]::OpenRead($fileInfo.FullName)
$buffer = New-Object byte[] $chunkSize
try {
    foreach ($index in 0..($init.totalChunks - 1)) {
        if ($Skip -contains $index) {
            Write-Host "Chunk $index skipped"
            continue
        }
        Send-Chunk $index
    }
    $status = Invoke-RestMethod -Method Get -Uri "$api/$uploadId"
    Show-Status $status

    # Resume: send only the indexes the server has not received
    foreach ($index in (Get-Missing $status)) {
        Send-Chunk $index
    }
    Show-Status (Invoke-RestMethod -Method Get -Uri "$api/$uploadId")
}
finally {
    $stream.Dispose()
    $client.Dispose()
}