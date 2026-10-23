# Manual test for FT-41: init, chunks, status.
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

function Show-Status($status) {
    Write-Host ("Status: {0} | received {1}/{2} ({3}%) | missing: [{4}]" -f `
        $status.status, $status.received, $status.totalChunks, $status.percent, (@($status.missing) -join ", "))
}

function Send-Chunk([int] $index) {
    $stream.Position = [long] $index * $chunkSize
    $read = 0
    while ($read -lt $chunkSize) {
        $count = $stream.Read($buffer, $read, $chunkSize - $read)
        if ($count -eq 0) { break }
        $read += $count
    }

    $form = [System.Net.Http.MultipartFormDataContent]::new()
    $form.Add([System.Net.Http.StringContent]::new("$uploadId"), "uploadId")
    $form.Add([System.Net.Http.StringContent]::new("$index"), "index")
    $form.Add([System.Net.Http.ByteArrayContent]::new($buffer, 0, $read), "chunk", "$index.part")

    $response = $client.PostAsync("$api/chunk", $form).Result
    $body = $response.Content.ReadAsStringAsync().Result
    if (-not $response.IsSuccessStatusCode) {
        throw "Chunk $index rejected with HTTP $([int] $response.StatusCode): $body"
    }
    $status = $body | ConvertFrom-Json
    Write-Host ("Chunk {0} sent -> {1}/{2} ({3}%)" -f $index, $status.received, $status.totalChunks, $status.percent)
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

    # Resume: send only what the server reports as missing
    foreach ($index in @($status.missing)) {
        Send-Chunk $index
    }
    Show-Status (Invoke-RestMethod -Method Get -Uri "$api/$uploadId")
}
finally {
    $stream.Dispose()
    $client.Dispose()
}