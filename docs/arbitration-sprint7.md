# Sprint 7 — Arbitration (FT-40)

Session: **2026-10-18** — attendees: _to fill_.
Result: [api-phase2.md](api-phase2.md).

## Decisions

| #  | Question                                                               | Decision                                                               | Why                                                                                                         | Cost                                                                                | 
|----|------------------------------------------------------------------------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| D1 | Room lifetime: 30 min idle (mock-ups) or 24 h from creation (backend)? | **6 h since last activity**; an open WebSocket counts as activity      | 30 min cuts long transfers; 24 h keeps abandoned rooms and files on disk                                    | Medium                                                                              | 
| D2 | Host approval before joining (mock-up 04)?                             | **Yes**                                                                | A 6-digit code can be guessed or overheard on a shared network                                              | Large                                                                               | 
| D3 | Language selector EN/FR/DE?                                            | **EN only for now**                                                    | No i18n budget in Phase 2                                                                                   | None                                                                                |
| D4 | Room capacity limited to 2?                                            | **N-device model, limit 2 by config**                                  | Matches the 1-to-1 mock-ups, extensible later                                                               | Small                                                                               | 
| D5 | "Download all" on mobile?                                              | **Yes, one zip built by the server**; empty room → 404                 | Several simultaneous downloads are blocked on mobile browsers                                               | Medium                                                                              |
| D6 | Host leaves: transfer the role?                                        | **No transfer in S7**; pending requests wait for the host to reconnect | A short disconnect (screen lock) would make the role bounce; with 2 devices max nobody else needs approving | None now; transfer to the oldest member becomes a ticket when capacity goes above 2 | 

## Open questions

1. **Mock-up 04:** does it show every state of the join flow (waiting, approved, rejected, room full)?

## Notes for the implementation tickets

- **D1:** replace `app.rooms.ttl` with `app.rooms.idle-ttl: 6h`; `Room` stores `lastActivityAt`; a scheduled sweep
  deletes expired rooms with their uploads and files, then publishes `ROOM_EXPIRED`. `GET` endpoints do not count as
  activity.
- **D2:** breaking change on `POST /api/rooms` (body required). Pending devices do not use a slot; capacity is checked
  at request **and** at approval. New exceptions: `NotRoomHostException` (403), `JoinRequestNotFoundException` (404).
  `hostDeviceId` is visible to members — acceptable on a LAN only.
- **D4:** `app.rooms.max-devices: 2`, stored per room at creation. Capacity check + insertion must be atomic. New
  `RoomFullException` (409).
- **D5:** stream the zip while writing it (files up to 2 GB), store entries without compression, completed files only.
- **S7-1 (chunks):** the chunk body is not multipart, so `spring.servlet.multipart.max-file-size` does not protect the
  endpoint — check the size explicitly. New `InvalidChunkException` (400) and `UploadStateConflictException` (409).

## Known gaps to fix (outside the S7 tickets)

1. `GlobalExceptionHandler.handleBadRequest(IllegalArgumentException)` returns `{"message": …}` instead of an
   `ApiError`.
2. The `MaxUploadSizeExceededException` handler hardcodes `"10MB"`.
