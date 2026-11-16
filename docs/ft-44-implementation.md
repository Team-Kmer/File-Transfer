# FT-44 implementation brief

## Behaviors and acceptance criteria
- Select/drop one nonempty file; POST init with current room, device identity, filename, size and MIME type. Reject empty/blocked files and sizes above 2 GiB early; server validation remains authoritative.
- Slice lazily with the server's chunk size. Send sequential PUTs with application/octet-stream, including partial/exact final chunks; never buffer the whole file.
- Count acknowledged bytes only. Display percent, 100-cell grid, average speed and ETA. Recompute with a ticking clock while requests wait; unknown speed displays an em dash.
- Retry network/5xx failures on the same index at 500/1000/2000 ms; stop after four failures. Client errors are final.
- Cancel requests and retry timers; DELETE initialized uploads. DELETE 409 is an already-finished-or-cancelled terminal outcome; other errors remain visible. Cancel on component destruction.
- Preserve completion fileId; show completion, cancellation and status-based errors; allow another upload.
- Replace the room placeholder with accessible selection, drop, progress and cancel controls.

## Assumptions
- One transfer at a time; selection starts immediately. Queues/reload resume are outside FT-44.
- 2 GB means 2 * 1024^3 bytes, matching backend configuration.
- Cancelling init stops the request; DELETE needs a known uploadId. DELETE 409 has no fileId: do not invent one.
- Retain the existing features/room area convention instead of migrating unrelated views.
- Create a dedicated component; do not reuse the phase-one 10 MB uploader.
- Enum-tagged interfaces model state because coding guidelines prohibit type aliases.

## Files and layers
Paths below are relative to frontend/file-transfer-app/src/app/.
- core/classes/uploads/{chunk-math,upload-progress,retry-policy,upload-error-message,upload-validation}.ts: pure entity functions; no Angular imports.
- core/interfaces/uploads/{chunk-range,progress-snapshot,init-upload-request,init-upload-response,chunk-received-response,upload-state}.ts: one interface per file; separate request/response DTOs. Add upload-plan.ts and chunk-acknowledgement.ts here for domain responses mapped at the HTTP boundary.
- core/enums/{upload-phase,chunk-status}.ts: fixed states.
- core/services/{chunked-upload-api,chunked-upload-mapping,chunked-upload}.service.ts: HTTP edge, boundary mapping and orchestration. Dependencies point inward to entities and existing session/identity.
- features/room/services/upload-presentation.service.ts and interfaces/upload-display.ts: prepared view data.
- features/room/components/{room-upload,upload-progress}/: standalone adapters with .ts/.html/.scss/.tw.css, signal inputs, named event handlers. Templates <=40 lines, host container, Tailwind/token styles; components never receive DTOs.
- room-shell/: compose uploader, remove obsolete placeholder styles.
- Colocated specs exercise public seams.

## Committed seams (before the first test)
1. Pure chunkRange/computeProgress/isRetryable/retryDelayMs/uploadErrorMessage/validation functions: worked examples and boundary cases, no TestBed.
2. ChunkedUploadService.start/cancel and readonly state: real API/mapping services, HttpTestingController, fake timers; sequential bytes/metadata/progress/retries/cancellation races.
3. RoomUpload DOM and file/drop events: real services with HTTP test backend; selection, drop, validation, progress, cancel, success, destruction.
4. Existing room-route DOM: joined room has an enabled upload control.

## Validation record
Baseline suite could not execute assertions: sandbox EPERM while renaming Vitest temporary cache files. Re-run with permissions required for local testing. Record red/green cycles, suite/build and guideline review below. Live 100 MB integrity, Chrome/Firefox and throttling checks are separate from automated verification.

## Guideline adaptations required by the input
- Keep uploadErrorMessage as a pure status-based function, explicitly requested by FT-44, even though generic mapping guidelines prefer injectable mapping services. HTTP response DTO mapping still lives in ChunkedUploadMappingService.

## Review-added seams
5. UploadPresentationService.presentProgress: byte-unit boundaries, zero-speed/unknown-time placeholders, minute rollover and empty/full grids. Busy guards are covered through start/state and HTTP requests.

## Final implementation and validation summary
- Implemented all brief behaviors: lazy sequential chunks, explicit binary content type, acknowledged-byte progress and ticking ETA, bounded retry, status-based validation/errors, cancellation including DELETE 409, completion fileId, accessible file selection/drop, 100-cell grid, and room composition.
- Guidelines loaded: angular-workflow-project-structure-guidelines, angular-workflow-clean-architecture-guidelines, angular-workflow-coding-guidelines, angular-workflow-clean-code-guidelines, angular-workflow-html-guidelines and angular-workflow-css-guidelines; plus test-driven-design and review-with-guidelines.
- Red/green slices: chunk ranges; deterministic progress; retry policy; error messages; client validation; sequential HTTP flow; timed retries; ticking progress; cancellation; service validation; rendered selection/progress; drop and room integration. Each slice was executed failing before its implementation. Review then added regression coverage for already implemented busy guards and public presenter boundaries.
- Final targeted run: 9 spec files, 48 tests passed. Seams exercised: pure functions, service start/cancel/state with the real API/mapping layer, room uploader DOM/events/destruction, room route DOM, and presenter public methods.
- Full suite after final code changes: 191 passed, 4 failed (195 total). A separate temporary archive of unchanged HEAD had the same four failing receive specs (156 passed, 4 failed): receive.spec.ts, receive-handler-service.spec.ts, display-available-files.spec.ts and delete-file-dialog.spec.ts. These pre-existing failures were not changed.
- Development build passed. Production build is blocked by the existing phase-one send/component/upload/upload.tw.css budget: 10.78 kB against 8 kB. The unchanged HEAD archive reproduced the same failure.
- Independent review: six aspect agents, two passes. First pass prompted domain response mapping, condition/name/member-order cleanup and added tests; second pass returned NONE on every aspect. The pure error-message function and existing features area are explicit input adaptations, not unresolved review findings. No remaining FT-44 guideline findings.
- Real backend integration: a deterministic 104857600-byte file was sent by an API harness to an isolated backend on port 8081 in 20 sequential chunks of the server-provided size. Result COMPLETED; source and assembled file SHA-256 both 40EB6433E22CF142EF8B573370FD8179230A743ACE1F0C08C07F8E554644875A.
- Browser: an isolated frontend copy on port 4300 (only its temporary API base changed to 8081) created/joined a room and rendered the upload panel correctly. The browser automation file chooser failed before upload started; therefore the 100 MB integrity result is API-level evidence, not a completed browser upload.
- Still manual: 100 MB upload through Chrome and Firefox, Slow 3G rendering/responsiveness, and stopping/restarting the live backend during an upload. Retry timing, truthful progress and cancellation are covered automatically.
- Test data/processes were confined to dedicated temporary paths and ports; existing applications on 4200/8080 were not interrupted.
- Assumptions retained: one immediate transfer at a time; 2 GiB cap; no queue or reload resume; no DELETE before an init uploadId is known; no invented fileId for DELETE 409; keep features/room and the legacy 10 MB uploader separate; use enum-tagged interfaces.


## English-only message correction
- Behavior: every FT-44 error and cancellation message must be English, including status-specific, network, server and fallback messages.
- Acceptance: existing pure-message, service-state and DOM tests expect English text; no French FT-44 messages remain.
- Files: core/classes/uploads/upload-error-message.ts and its spec; core/services/chunked-upload.service.ts and its spec; room-upload.spec.ts. Layers and public APIs are unchanged.
- Existing committed seams cover this correction. No new seam or architectural assumption is needed.
- Correction validated test-first: the English assertions failed in 10 cases before translation; all 25 affected tests then passed.
- All FT-44 status, fallback and cancellation messages are now English. No French FT-44 message matches remain in source/tests.
- Independent correction review: coding, clean-code and architecture agents returned NONE on the first pass; structure/HTML/CSS slices were empty. No new assumptions, dependencies or public APIs.
- Full suite after the language correction: 191 passed, the same 4 pre-existing receive tests failed. The prior production CSS budget limitation is unchanged.

## Regression follow-up
The current implementation scopes orchestration to RoomUpload and moves it to features/room/services/chunked-upload.service.ts. See [FT-44 regression fixes](ft-44-regression-fixes.md) for the latest state/cleanup behavior, UI corrections, assumptions and verification results; earlier validation entries above describe the original implementation.
