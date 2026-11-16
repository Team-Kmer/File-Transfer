
# FT-44 regression fixes

## Behaviors and acceptance
1. Scope orchestration to each RoomUpload instance: cancelled/completed/error state never appears in a new room or a newly created uploader. Destroying an active uploader aborts its upload; old cleanup responses cannot affect another instance.
2. Clear display before validating a new selection: invalid files and missing rooms show an English error with empty filename, zero total/sent bytes, no previous fileId or grid.
3. Cancelled/Error/Cancelling states display unknown speed and ETA; acknowledged bytes stay visible for interrupted uploads.
4. On final chunk error, abort the known server upload exactly once and preserve the original upload error. Clear uploadId after completion or successful cleanup. Never DELETE completed uploads after later invalid selection or view destruction.
5. Cleanup failures remain visible, retain the upload identity for retry and block new selection until retry succeeds. Pending cleanup survives destruction so navigation cannot interrupt the DELETE.
6. Render square centered grid cells and rounded aria-valuenow; format seconds/minutes/hours as 1 s, 1 min 05 s and 2 h 05 min 00 s.
7. Use color-danger for errors and the existing primary/success token for completion; restore an upload icon and hide empty filename/status elements.
8. Ignore dragleave when relatedTarget remains inside the drop zone. Prevent dragover/drop browser navigation on window only while a joined RoomShell exists.
9. Show the confirmed completed fileId in the uploader. Room file listing/count remains outside this change because the backend has no room-files GET route.
10. Inspect and remove only the explicitly named disposable test file through its API where possible; inspect the named rooms without restarting the backend or inventing a deletion endpoint.

## File and dependency decisions (relative to frontend/file-transfer-app/src/app/)
- Move core/services/chunked-upload.service.ts and its spec to features/room/services/: view-local orchestration provided by RoomUpload, no root provider. Retain the existing features area convention required by the original guide.
- core/interfaces/uploads/upload-state.ts: entity state gains cleanup status/message, still Angular-free.
- core/services/chunked-upload-api.service.ts and chunked-upload-mapping.service.ts remain singleton HTTP/DTO edges. View service depends inward on core; core never imports the view.
- features/room/interfaces/upload-display.ts, services/upload-presentation.service.ts and spec: prepare flags/labels for terminal metrics, cleanup retry and final fileId.
- features/room/components/room-upload/{.ts,.html,.tw.css,.spec.ts}: scoped provider, named handlers, no HTTP in components; standalone and existing stylesheet set retained.
- features/room/components/upload-progress/{.ts,.tw.css}: live-metrics signal input, square cells.
- features/room/components/room-shell/room-shell.ts and spec: window drag/drop guard with joined-room lifecycle.
- No backend production changes and no new public API routes.

## Committed seams before tests
- RoomUpload DOM/events/destruction and successive component instances: room isolation, validation replacement, terminal labels, cleanup retry, success/fileId, idle spacing and drag boundary.
- ChunkedUploadService public start/cancel/state and HTTP boundary with fake timers: exhausted retries, cleanup success/failure/conflicts, no DELETE after completion, no stale callbacks, no concurrent selection during cleanup.
- UploadPresentationService public present/presentProgress: inactive metrics, integer percentages and duration boundaries.
- RoomShell DOM/window events and component destruction: outside drops prevented only for the joined-room lifetime.
- Existing room route tests: route changes recreate uploader state.
- Visual grid/token changes are checked via stylesheet review and compilation rather than source-mirroring tests.

## Assumptions and scope
- All code, UI text and technical documentation stay English; conversation stays French.
- One transfer at a time. A failed server cleanup must be retried before another upload.
- Unknown uploadId during cancelled init remains unabortable; no fake server identity is created.
- Automatic cleanup accepts 404/409 as already terminal; manual abort keeps the existing 409 terminal message.
- Completed fileId is shown as confirmation. GET room files and FILE_AVAILABLE consumption remain separate work.
- The original six guidelines, TDD and independent review apply. Previously demonstrated receive-test failures and legacy CSS production budget are recorded separately if still present.

## Final result and validation
- All four functional regressions are fixed: each uploader owns its orchestration instance; invalid selection clears the prior filename/progress/fileId; interrupted metrics become unknown; failed transfers abort the server upload and completed ids cannot be aborted later.
- Cleanup is serialized with selection. A failed DELETE preserves the upload error, exposes the cleanup failure, retains the known upload id for retry and blocks new files until cleanup succeeds. Cleanup already in flight survives component destruction and cannot affect another uploader.
- UI fixes: centered square cells, integer progress accessibility values, seconds/minutes/hours formatting, color-danger errors, a primary-colored success checkmark, restored upload arrow, no empty idle paragraphs and visible confirmed fileId.
- Drag fixes: containment guard plus nested drag counter supports missing relatedTarget; window-level file navigation prevention is bound only while RoomShell exists. Non-file drags keep their normal behavior.
- Scope retained: room-file count/list synchronization still needs the backend room-files GET / FILE_AVAILABLE integration. This change displays the completed fileId without inventing a server-backed list.
- Named disposable 100 MB file 0307b6cd-849f-4798-a113-bb62de75982f.bin was removed through DELETE /api/files/{id}; its on-disk path was verified absent afterward. Rooms 205008 and 749277 were inspected and left to their configured expiration because no room DELETE endpoint exists; the backend was not restarted.
- Rules applied: project structure, clean architecture, coding, clean code, HTML and CSS guidelines, plus TDD and independent review. View-local orchestration moved to features/room/services; singleton API/mapping edges remain in core; all text remains English.
- Test-first slices reproduced room state leakage, stale validation display, cancelled metrics, missing server cleanup, invalid DELETE after completion, cleanup retry UI, idle/success rendering, duration/ARIA values and both drag/drop failures before their production fixes. Additional route and late-cleanup regression coverage exercises the same public seams.
- Final targeted tests: 13 spec files, 76 passing tests. Final complete suite: 215 passed / 3 pre-existing receive tests failed (218 total): receive-handler-service.spec.ts, delete-file-dialog.spec.ts and display-available-files.spec.ts. The previous fourth receive test passes with the real backend now available.
- Development build passes. Production compilation still fails only on the pre-existing send/component/upload/upload.tw.css style budget (10.78 kB vs 8 kB), with unrelated prior warnings unchanged.
- Independent review: one complete six-aspect pass, all NONE; a final supplemental coding/clean-code/HTML review of the nested-drag fallback also returned NONE. No unresolved guideline findings.
- The original assumptions remain: one upload at a time, no reload resume or fake id for cancelled init, cleanup must be retried before a new transfer, no invented room deletion/listing API. Live cross-browser and throttled-network checks were not repeated in this correction pass.

