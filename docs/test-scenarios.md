# MVP Manual Test Scenarios

This document describes the manual validation scenarios for the File Transfer MVP.

Run every scenario before closing a development phase or releasing a new version.

## Status values

| Status    | Meaning                                                      |
|-----------|--------------------------------------------------------------|
| `NOT RUN` | The scenario has not been executed yet                       |
| `PASS`    | The actual result matches the expected result                |
| `FAIL`    | The actual result does not match the expected result         |
| `BLOCKED` | The scenario cannot be executed because of an external issue |

A validation run is successful only when every scenario has the status `PASS`.
No scenario may remain `FAIL`, `BLOCKED`, or `NOT RUN` when the ticket is closed.

## Validation run

| Field            | Value                    |
|------------------|--------------------------|
| Date             | YYYY-MM-DD               |
| Tester           | Name                     |
| Branch           | Branch name              |
| Commit           | Commit SHA               |
| Operating system | Windows / Linux          |
| Browser          | Browser name and version |
| Result           | `PASS`                   |

## General setup

### Start the backend

From the repository root:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

The backend must be available at:

```text
http://localhost:8080
```

### Start the frontend

Open another terminal from the repository root:

```powershell
cd frontend/file-transfer-app
npm install
npm start
```

The frontend must be available at:

```text
http://localhost:4200
```

### Prepare the test files

Run the following commands in PowerShell:

```powershell
$testData = Join-Path $env:TEMP "file-transfer-mvp-tests"

New-Item -ItemType Directory -Force -Path $testData | Out-Null

Set-Content `
  -Path (Join-Path $testData "normal-upload.txt") `
  -Value "File Transfer MVP manual test"

Set-Content `
  -Path (Join-Path $testData "first.txt") `
  -Value "First test file"

Set-Content `
  -Path (Join-Path $testData "second.txt") `
  -Value "Second test file"

Set-Content `
  -Path (Join-Path $testData "third.txt") `
  -Value "Third test file"

$emptyFile = [System.IO.File]::Create(
  (Join-Path $testData "empty.txt")
)
$emptyFile.Dispose()

$maximumSizeFile = [System.IO.File]::Create(
  (Join-Path $testData "exactly-10mb.bin")
)
$maximumSizeFile.SetLength(10MB)
$maximumSizeFile.Dispose()

$oversizedFile = [System.IO.File]::Create(
  (Join-Path $testData "larger-than-10mb.bin")
)
$oversizedFile.SetLength(10MB + 1)
$oversizedFile.Dispose()

Write-Host "Test files created in: $testData"
```

Use the displayed directory when selecting files in the browser.

## Manual test scenarios

| ID     | Scenario                         | Preconditions                                                                                                                                      | Steps                                                                                                                                                                                                                                                                                                                                                                                                           | Expected result                                                                                                                                                                                                                         | Status |
|--------|----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| MVP-01 | Empty file listing               | Backend and frontend are running.                                                                                                                  | 1. Open `http://localhost:4200/receive`.<br>2. If files are listed, delete each file and confirm every deletion.<br>3. Click **Refresh**.                                                                                                                                                                                                                                                                       | The page displays `0 files ready to download` and `No files available`. No error is displayed.                                                                                                                                          | `PASS` |
| MVP-02 | Normal file upload               | Backend and frontend are running. `normal-upload.txt` exists in the test-data directory.                                                           | 1. Open `http://localhost:4200/send`.<br>2. Click the upload area.<br>3. Select `normal-upload.txt`.<br>4. Verify that the selected filename is displayed.<br>5. Click **Send**.<br>6. Open `http://localhost:4200/receive`.                                                                                                                                                                                    | The upload completes without an error. The Send page displays the file with the `Sent` status. The Receive page lists `normal-upload.txt` with its size and upload date.                                                                | `PASS` |
| MVP-03 | Upload a file at the 10 MB limit | Backend and frontend are running. `exactly-10mb.bin` exists.                                                                                       | 1. Open `http://localhost:4200/send`.<br>2. Select `exactly-10mb.bin`.<br>3. Click **Send**.<br>4. Open `http://localhost:4200/receive`.                                                                                                                                                                                                                                                                        | The file is accepted and uploaded. `exactly-10mb.bin` appears in the available-files list with a size of approximately 10 MB.                                                                                                           | `PASS` |
| MVP-04 | Upload a file larger than 10 MB  | Backend and frontend are running. `larger-than-10mb.bin` exists.                                                                                   | 1. Open `http://localhost:4200/send`.<br>2. Select `larger-than-10mb.bin`.<br>3. Observe the page.<br>4. Open `http://localhost:4200/receive` and click **Refresh**.                                                                                                                                                                                                                                            | The Send page displays `File size exceeded (max 10 MB)`. The Send button remains disabled and the file is not added to the available-files list.                                                                                        | `PASS` |
| MVP-05 | Upload a zero-byte file          | Backend and frontend are running. `empty.txt` exists and has a size of 0 bytes.                                                                    | 1. Open `http://localhost:4200/send`.<br>2. Select `empty.txt`.<br>3. Click **Send**.<br>4. Open `http://localhost:4200/receive` and click **Refresh**.                                                                                                                                                                                                                                                         | The frontend rejects the upload. The Send page displays an error and `empty.txt` is not added to the available-files list.                                                                                                              | `PASS` |
| MVP-06 | List multiple files              | Backend and frontend are running. `first.txt`, `second.txt`, and `third.txt` exist.                                                                | 1. Open `http://localhost:4200/send`.<br>2. Upload `first.txt`.<br>3. Upload `second.txt`.<br>4. Upload `third.txt`.<br>5. Open `http://localhost:4200/receive`.<br>6. Click **Refresh**.                                                                                                                                                                                                                       | All three files are displayed. Each row contains a filename, size, upload date, download button, and delete button. The most recently uploaded file, `third.txt`, appears before `second.txt` and `first.txt`.                          | `PASS` |
| MVP-07 | Download a file                  | Backend and frontend are running. `normal-upload.txt` is listed on the Receive page. Remove any previous copy from the browser download directory. | 1. Open `http://localhost:4200/receive`.<br>2. Find `normal-upload.txt`.<br>3. Click its download button.<br>4. Open the downloaded file.                                                                                                                                                                                                                                                                       | The browser downloads a file named `normal-upload.txt`. The file opens successfully and contains `File Transfer MVP manual test`. The file remains listed in the application.                                                           | `PASS` |
| MVP-08 | Cancel a deletion                | Backend and frontend are running. At least one file is listed on the Receive page.                                                                 | 1. Open `http://localhost:4200/receive`.<br>2. Click the delete button of a listed file.<br>3. Verify that the confirmation dialog displays the correct filename.<br>4. Click **Cancel**.                                                                                                                                                                                                                       | The dialog closes. The file remains in the list and can still be downloaded.                                                                                                                                                            | `PASS` |
| MVP-09 | Delete an existing file          | Backend and frontend are running. At least one file is listed on the Receive page.                                                                 | 1. Open `http://localhost:4200/receive`.<br>2. Click the delete button of a listed file.<br>3. Click **Delete** in the confirmation dialog.<br>4. Click **Refresh**.                                                                                                                                                                                                                                            | The dialog closes. A deletion confirmation notification is displayed. The deleted file no longer appears in the list.                                                                                                                   | `PASS` |
| MVP-10 | Delete an unknown file ID        | Backend is running. PowerShell is available.                                                                                                       | 1. Open PowerShell.<br>2. Run `curl.exe -i -X DELETE http://localhost:8080/api/files/00000000-0000-0000-0000-000000000000`.<br>3. Inspect the HTTP response.                                                                                                                                                                                                                                                    | The backend returns HTTP `404 Not Found`. The response explains that the file was not found. The backend remains operational.                                                                                                           | `PASS` |
| MVP-11 | Navigate between pages           | Frontend and backend are running.                                                                                                                  | 1. Open `http://localhost:4200`.<br>2. Verify that the home page displays **Send** and **Receive**.<br>3. Click **Send**.<br>4. Verify that the URL ends with `/send` and the page displays `Send a file`.<br>5. Use the browser Back button.<br>6. Click **Receive**.<br>7. Verify that the URL ends with `/receive` and the page displays `Available files`.<br>8. Open `http://localhost:4200/unknown-page`. | The Send and Receive buttons open the correct pages. The browser Back button returns to the home page. An unknown route redirects to the home page without displaying an error.                                                         | `PASS` |
| MVP-12 | Backend becomes unavailable      | The frontend page is open and the backend is initially running.                                                                                    | 1. Open `http://localhost:4200/receive` and confirm that the list loads.<br>2. Stop the backend with `Ctrl+C` in its terminal.<br>3. Return to the Receive page.<br>4. Click **Refresh**.<br>5. Open `http://localhost:4200/send`.<br>6. Select `normal-upload.txt` and click **Send**.                                                                                                                         | The frontend remains open. The Receive page displays `Unable to load files` and indicates that the server is unreachable. The Send page displays `Unable to reach the server`. The application does not freeze or display a blank page. | `PASS` |
| MVP-13 | Recover after backend restart    | The frontend is running. The backend was stopped during MVP-12.                                                                                    | 1. Restart the backend with `.\mvnw.cmd spring-boot:run`.<br>2. Wait until the backend has started.<br>3. Open `http://localhost:4200/receive`.<br>4. Click **Refresh**.<br>5. Upload `normal-upload.txt` from the Send page.                                                                                                                                                                                   | The file list loads again without restarting the frontend. A new upload succeeds and appears on the Receive page.                                                                                                                       | `PASS` |

## Test result

After executing every scenario:

1. Replace each `NOT RUN` value with `PASS`, `FAIL`, or `BLOCKED`.
2. Record every failure in the related Jira ticket.
3. Fix and rerun every failed scenario.
4. Set the validation-run result to `PASS` only when all scenarios pass.

| Final check                      | Status |
|----------------------------------|--------|
| All scenarios were executed      | `PASS` |
| No scenario has status `FAIL`    | `PASS` |
| No scenario has status `BLOCKED` | `PASS` |
| No scenario has status `NOT RUN` | `PASS` |
| Overall MVP validation           | `PASS` |