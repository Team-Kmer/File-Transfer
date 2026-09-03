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

## Build

```bash
./mvnw clean verify
```

## Tests

```bash
./mvnw test
```