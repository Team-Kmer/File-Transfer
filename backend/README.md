# File Transfer — Backend

Spring Boot 4 backend service for the File Transfer application.

## Prerequisites

- **Java 21** (Amazon Corretto or Eclipse Temurin recommended)
- Maven Wrapper is included — no local Maven install required

## Running locally

From the `backend/` directory:

```bash
# macOS / Linux
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

The service listens on `http://localhost:8080`.

## Health check

Once the app is running, verify it responds:

```bash
curl http://localhost:8080/actuator/health
# → {"status":"UP", ...}
```

## Available endpoints (Phase 0)

| Method | Path               | Purpose                                           |
|--------|--------------------|---------------------------------------------------|
| GET    | `/actuator/health` | Liveness and readiness health probe               |
| GET    | `/actuator/info`   | Build and application metadata                    |
| GET    | `/api/health`      | Application health check consumed by the frontend |

## File endpoints (Phase 1)

| Method | Path                       | Purpose                                                      |
|--------|----------------------------|--------------------------------------------------------------|
| GET    | `/api/files`               | List available files with their metadata (most recent first) |
| GET    | `/api/files/{id}/download` | download a stored file by its id                             |         
| POST   | `/api/files/upload`        | upload a file by                                             |

## Chunked upload endpoints (Phase 2)

| Method | Path                           | Purpose                                                                   |
|--------|--------------------------------|---------------------------------------------------------------------------|
| POST   | `/api/files/upload/init`       | Open an upload session and get `uploadId`, `chunkSize`, `totalChunks`     |
| DELETE | `/api/files/upload/{uploadId}` | Is the cleanup path**. Abort a session and delete its temporary directory |


## Configuration

Base configuration lives in `src/main/resources/application.yml`.
Local dev overrides go in `application-local.yml` (gitignored, not tracked).

## Package structure

We follow **package-by-feature** (see [CONTRIBUTING.md](../CONTRIBUTING.md)):

| Package      | Scope                                                   |
|--------------|---------------------------------------------------------|
| `file/`      | File upload, download, storage, chunking                |
| `rooms/`     | Pairing sessions (Phase 2)                              |
| `signaling/` | WebRTC signaling (Phase 3)                              |
| `config/`    | Cross-cutting configuration (CORS, WebSocket, security) |
| `common/`    | Shared utilities                                        |

## CORS Configuration

The backend uses **CORS** (not a dev proxy) to allow the Angular frontend to
call the API. This keeps the same mechanism in dev and prod — no surprises
when deploying.

**Allowed origin** is configured in `application.yml`:

```yaml
app:
  cors:
    allowed-origin: http://localhost:4200
```
## File storage

Uploaded files are written to a local directory and their metadata is kept in
memory (no database in the MVP). The directory is created automatically at
startup, and files are stored under an anonymized `UUID.extension` name.

The storage path is configurable in `application.yml` and defaults to
`<system temp dir>/file-transfer`:

```yaml
app:
  storage:
    path: ${java.io.tmpdir}/file-transfer
```

## WebSocket (STOMP)

- Connection URL: `ws://localhost:8080/ws`
- Subscribe on `/topic/...`, send on `/app/...`
- Allowed origins: same list as the REST API (`app.cors.allowed-origins`), including `APP_CORS_LAN_ORIGIN`

### Echo (dev profile only)

A message sent to `/app/echo` is broadcast back on `/topic/echo`. It only exists under the `dev` profile:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
.\mvnw.cmd spring-boot:run
```

### Manual test

Open `http://localhost:4200`, then in the browser console (F12) run these lines one by one:

```js
const ws = new WebSocket("ws://localhost:8080/ws");
ws.onmessage = e => console.log(e.data);
ws.send("CONNECT\naccept-version:1.2\nhost:localhost\n\n\0");
ws.send("SUBSCRIBE\nid:sub-0\ndestination:/topic/echo\n\n\0");
ws.send("SEND\ndestination:/app/echo\ncontent-type:text/plain\n\nhello\0");
```

Expected: a `CONNECTED` frame, then a `MESSAGE` frame containing `hello`.

## Build

```bash
./mvnw clean verify
```

## Tests

```bash
./mvnw test
```