# Transfer screens implementation

## Behaviors and acceptance criteria

1. Responsive active transfer card matches the three supplied PDF references: file summary, percentage and byte count, linear progress, 100 square chunk cells (20 columns mobile, 25 desktop), legend and three statistics. Values come from real acknowledgements; no sample filenames, device names or invented throughput.
2. A retryable interruption preserves the upload and File in this room. Automatic retries show Reconnecting; exhaustion shows Paused with received chunk count and Resume now. Resume reads GET /api/files/upload/{id}, reconciles acknowledged indexes and sends only missing chunks. A completed server upload restores fileId without resending. Permanent errors retain cleanup behavior. Leaving the room cancels paused transfers too.
3. Active and paused transfers get compact responsive header indicators and a focused room layout. The existing home/waiting header remains compatible. English copy and existing light/dark tokens apply throughout.
4. Session files display uploads completed in this browser and room, with real download and delete actions; no global file listing is presented as room-scoped. The list count updates immediately after acknowledgement.
5. Existing validation, room isolation, cancellation, cleanup retry and drop-navigation safeguards remain intact.

## Assumptions and limits

The PDFs are visual references, not process instructions. They imply same-page manual resume; persisting File bytes across reloads is out of scope. Existing backend GET upload status supports resume. No room-file GET or file-available realtime stream exists: list entries are locally confirmed completions, labelled accordingly, and header devices are in-session counts rather than claims of live connectivity. Remote live-progress copy and sample file expirations are omitted. Cancel remains a deliberate DELETE; retryable pauses preserve server chunks until resume/cancel/room exit. Statistics count acknowledged bytes only. Error statistics stay hidden. Existing features/room layout is retained without unrelated project migration.

## Placement and boundaries

- core/enums/upload-phase.ts and new upload-server-status.ts: pure domain/status enums.
- core/interfaces/uploads/upload-status-response.ts: GET DTO; upload-checkpoint.ts: mapped domain result; upload-state.ts: plan/index/interruption state.
- core/services/chunked-upload-api.service.ts and chunked-upload-mapping.service.ts: HTTP and DTO mapping only.
- features/room/services/chunked-upload.service.ts: room-instance orchestration and resume, depending inward on core.
- features/room/services/upload-presentation.service.ts plus new chunk-grid-presentation.service.ts and transfer-summary.service.ts: prepared presentation models, no component business transformations.
- features/room/interfaces/{chunk-cell-display,chunk-grid-display,transfer-summary,session-file}.ts: pure view models.
- features/room/components/{transfer-details,chunk-grid,transfer-actions,session-files,session-file-card}/: standalone component .ts/.html/.scss/.tw.css sets, input models and fire/on/resolve outputs; templates <=40 lines.
- features/room/services/session-files.service.ts: room-local confirmed file list and file actions through core API.
- shared/interfaces/transfer-header.ts and shared/components/transfer-indicator/: generic reusable header presentation; no shared import from room.
- Existing room-upload/progress/shell/page and shared page-header compose these parts. State travels through typed outputs, services stay room-local. No DTO reaches a component.

## Test seams committed before tests

1. ChunkedUploadService public start/resume/cancel/state with real API/mapping and HttpTestingController: retry exhaustion preserves chunks, GET reconciliation skips already received chunks, lost final acknowledgement recovers completion, resume failure stays paused, permanent errors clean up, paused cancellation/teardown aborts, no duplicate init or inflation.
2. ChunkGridPresentationService public present: 200 chunks/47 acknowledgements, partial/current/failed cells, fewer than 100 chunks, noncontiguous acknowledgements, accessible prepared labels.
3. RoomUpload and child component inputs/outputs/rendered DOM: real file selection, active grid/statistics, paused Resume action, cleanup/validation compatibility and rounded accessibility values.
4. SessionFilesService public receiveCompletion/remove/state with HTTP: deduplication, count, deletion success/failure, isolation per room; card DOM exposes real download URL.
5. RoomShell/RoomPage/PageHeader inputs, outputs and DOM: active layout and header propagation, reset on room changes, paused indicator and mobile/desktop styles. Visual verification uses desktop/mobile screenshots of production components where possible.

## Guidelines

All six Angular guidelines loaded: structure, architecture, coding, clean code, HTML and CSS; test-driven-design and independent review workflow apply. No backend changes are planned.

## Progress

- Slice 1 (pause and resume) is implemented. After the fourth failed attempt on a chunk with a network or 5xx error, the upload goes to Paused instead of Error. The server upload and the selected File are kept. Resume now calls GET /api/files/upload/{id}, rebuilds the acknowledged indexes and sends only the missing chunks. A COMPLETED status restores the fileId without resending. An ABORTED status becomes a 409 error. A retryable GET failure pauses again. Cancel and leaving the room both abort a paused upload. New selections are blocked while an upload is paused.
- Speed is an average over active time only: the time spent paused is left out.
- Files changed: core/enums/upload-phase.ts (Paused), core/enums/upload-server-status.ts, core/interfaces/uploads/{upload-status-response,upload-checkpoint}.ts, ChunkedUploadApiService.getStatus, ChunkedUploadMappingService.toCheckpoint, features/room/services/chunked-upload.service.ts, upload-presentation.service.ts, interfaces/upload-display.ts, room-upload.{html,ts,tw.css} (Resume now button, warning-coloured paused message).
- Tests: the existing service red tests now pass, and two RoomUpload DOM tests were added (pause, then resume only the missing chunks; cancel while paused). Full suite: 218 passed, plus the same 3 receive tests that already failed.
- Live check (Chromium, real backend): a 40 MB file with fetch blocked from chunk 4 on. Chunk 4 was tried 4 times, then the upload paused at "4 of 8 chunks received" with unknown metrics. Resume sent GET, then chunks 4 to 7 only. Completed. Source and server SHA-256 are identical (aee70111…a4ad5401).
- Not done yet: slices 2 to 5 (chunk-grid presentation with 20/25 columns, session files list, header transfer indicators). They depend on the three PDF references, which are not in the repository.
