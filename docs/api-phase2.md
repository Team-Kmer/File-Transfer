# File-Transfer — Phase 2 API Contract

> **Status:** Draft (FT-40), awaiting approval by the three developers.
> Each endpoint is tagged **Implemented** (callable today) or **Planned S7** (agreed, not built yet).
> Decisions behind this contract: [arbitration-sprint7.md](arbitration-sprint7.md).

## Conventions

- Base URL `http://<host>:8080`, JSON in UTF-8, timestamps in ISO-8601 UTC, sizes in bytes.
- Room codes are 6 digits (`"482913"`). Upload and file IDs are UUIDs.
- Each browser generates a `deviceId` (UUID) once and keeps it in `localStorage`.

### Errors

Every error returns an `ApiError`:

```json
{
  "timestamp": "2026-10-18T09:12:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Room not found: 482913",
  "path": "/api/rooms/482913"
}
```

Branch on `status`, never on `message`.

| Status | When                                                                                      |
|--------|-------------------------------------------------------------------------------------------|
| 400    | Missing/blank field, malformed body, room code not 6 digits, ID not a UUID, invalid chunk |
| 403    | Action reserved to the host                                                               |
| 404    | Room unknown **or expired**, upload unknown, file unknown, nothing to download            |
| 409    | Room full, upload already completed or aborted                                            |
| 413    | File larger than 2 GB                                                                     |
| 415    | Blocked file type (`exe, msi, bat, cmd, com, scr, pif, ps1, vbs, jar, sh, dll`)           |
| 500    | Unexpected server error                                                                   |

The tables below only list errors **specific** to an endpoint; the 400/404 cases above always apply.

## Rooms

A room expires **6 hours after its last activity**. Activity = create, join, upload, abort, or an open WebSocket
connection. `expiresAt` moves forward accordingly: refresh your countdown from every response.

### Room object

```json
{
  "code": "482913",
  "hostDeviceId": "a7c3e1f2-0b4d-4c6e-8f9a-1b2c3d4e5f60",
  "createdAt": "2026-10-18T09:00:00Z",
  "lastActivityAt": "2026-10-18T09:05:40Z",
  "expiresAt": "2026-10-18T15:05:40Z",
  "maxDevices": 2,
  "devices": [
    {
      "deviceId": "a7c3e1f2-…",
      "name": "MacBook",
      "joinedAt": "2026-10-18T09:00:00Z"
    }
  ]
}
```

Display `devices.length / maxDevices`; never hardcode 2.
*Implemented today:* `code`, `createdAt`, `expiresAt`, `devices`. *Planned S7:* `hostDeviceId`, `lastActivityAt`,
`maxDevices`.

### `POST /api/rooms` — create a room

**Implemented** without body. **Planned S7:** the body below is required; the creator becomes the host and first device.

```json
{
  "deviceId": "a7c3e1f2-…",
  "name": "MacBook"
}
```

→ `201` Room object.

### `GET /api/rooms/{code}` — get a room

**Implemented.** → `200` Room object.

### `POST /api/rooms/{code}/join` — join a room

**Implemented** (direct join, `200`). **Planned S7:** join becomes a request the host approves.

```json
{
  "deviceId": "6d1f0c3e-…",
  "name": "Pixel 8"
}
```

| Result                                       | Response                                                                    |
|----------------------------------------------|-----------------------------------------------------------------------------|
| New device                                   | `202` `{ "code": "482913", "deviceId": "6d1f0c3e-…", "status": "PENDING" }` |
| Device already a member (refresh, reconnect) | `200` Room object, no extra slot used                                       |
| Room full                                    | `409`                                                                       |

The host role never moves: it stays with the creator, including after a reconnect. While the host is offline, join
requests stay `PENDING` until the host comes back.

### `POST /api/rooms/{code}/join-requests/{deviceId}/approve` and `/reject`

**Planned S7.** Called by the host.

```json
{
  "hostDeviceId": "a7c3e1f2-…"
}
```

| Result                             | Response          |
|------------------------------------|-------------------|
| Approved                           | `200` Room object |
| Rejected                           | `204`             |
| Caller is not the host             | `403`             |
| No pending request for this device | `404`             |
| Room full                          | `409`             |

## Uploads

Upload flow: **init → send every chunk → done**. A file belongs to the room: every other device can download it.

### `POST /api/files/upload/init` — start an upload

**Implemented.** `mimeType` is optional.

```json
{
  "filename": "holiday.mp4",
  "sizeBytes": 12582912,
  "mimeType": "video/mp4",
  "roomCode": "482913",
  "deviceId": "6d1f0c3e-…"
}
```

→ `201`

```json
{
  "uploadId": "3f2b8c1a-0d4e-4b5f-9a6c-7e8d9f0a1b2c",
  "chunkSize": 5242880,
  "totalChunks": 3
}
```

Errors: `400` empty file, `413` too large, `415` blocked type. (`deviceId` is **Planned S7**, optional.)

### `PUT /api/files/upload/{uploadId}/chunks/{index}` — send a chunk

**Planned S7.** Body: raw bytes, `Content-Type: application/octet-stream`.

- `index` goes from `0` to `totalChunks − 1`; chunks can be sent in any order.
- Each chunk is exactly `chunkSize` bytes, except the last: `sizeBytes − (totalChunks − 1) × chunkSize`.
- Re-sending a chunk is safe: retry any failed chunk.

→ `200`

```json
{
  "uploadId": "3f2b8c1a-…",
  "index": 1,
  "status": "IN_PROGRESS",
  "receivedChunks": 2,
  "totalChunks": 3
}
```

When the last chunk arrives, `status` is `COMPLETED` and the response adds `"fileId"`.
Errors: `400` index out of range or wrong size, `409` upload already completed or aborted.

### `GET /api/files/upload/{uploadId}` — upload status

**Planned S7.** Use it to resume: re-send only the missing indexes.

→ `200`

```json
{
  "uploadId": "3f2b8c1a-…",
  "filename": "holiday.mp4",
  "sizeBytes": 12582912,
  "status": "IN_PROGRESS",
  "chunkSize": 5242880,
  "totalChunks": 3,
  "receivedIndexes": [
    0,
    2
  ]
}
```

Statuses: `INITIALIZED`, `IN_PROGRESS`, `COMPLETED` (adds `fileId`).

### `DELETE /api/files/upload/{uploadId}` — abort an upload

**Implemented.** → `204`. An aborted upload no longer exists (`404` afterwards).

## Files of a room

### `GET /api/rooms/{code}/files` — list files

**Planned S7.** Completed files only, newest first. Empty room → `200 []`.

```json
[
  {
    "fileId": "9a1c2b3d-…",
    "filename": "holiday.mp4",
    "sizeBytes": 12582912,
    "mimeType": "video/mp4",
    "uploadedBy": "6d1f0c3e-…",
    "uploadedAt": "2026-10-18T09:05:40Z"
  }
]
```

### `GET /api/rooms/{code}/files/{fileId}/download` — download one file

**Planned S7.** Returns the file as an attachment.

### `GET /api/rooms/{code}/files/archive` — download all

**Planned S7.** Returns every file of the room in one `.zip` (`room-482913.zip`). Duplicate names get a suffix:
`photo (1).jpg`.
Errors: `404` if the room has no file.

## Real-time events (WebSocket)

**Planned S7.**

- Connect with STOMP to `ws://<host>:8080/ws`, CONNECT headers `deviceId` and `roomCode`, heartbeat `10000,10000`.
- Room members subscribe to `/topic/rooms/{code}`. A device waiting for approval subscribes to
  `/topic/rooms/{code}/join-requests/{deviceId}`.
- A refused connection or subscription returns a STOMP `ERROR` frame whose body is an `ApiError`.

Every event uses this envelope. Ignore unknown `type` values.

```json
{
  "type": "DEVICE_JOINED",
  "roomCode": "482913",
  "timestamp": "2026-10-18T09:01:12Z",
  "payload": {}
}
```

Payloads:

| `type`           | Topic        | `payload`                                                                                                                              |
|------------------|--------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `JOIN_REQUESTED` | room         | `{ "deviceId": "6d1f0c3e-…", "name": "Pixel 8" }`                                                                                      |
| `JOIN_APPROVED`  | join-request | `{ "room": <Room object> }`                                                                                                            |
| `JOIN_REJECTED`  | join-request | `{ }`                                                                                                                                  |
| `DEVICE_JOINED`  | room         | `{ "device": { "deviceId": "6d1f0c3e-…", "name": "Pixel 8", "joinedAt": "2026-10-18T09:01:12Z" }, "deviceCount": 2, "maxDevices": 2 }` |
| `DEVICE_LEFT`    | room         | `{ "deviceId": "6d1f0c3e-…" }` — connection closed; the device stays a member and can reconnect                                        |
| `FILE_AVAILABLE` | room         | `{ "fileId": "9a1c2b3d-…", "filename": "holiday.mp4", "sizeBytes": 12582912, "mimeType": "video/mp4", "uploadedBy": "6d1f0c3e-…" }`    |
| `ROOM_EXPIRED`   | room         | `{ "reason": "INACTIVITY" }` — go back to the home screen                                                                              |
