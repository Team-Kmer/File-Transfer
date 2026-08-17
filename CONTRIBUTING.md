# Contributing

Engineering guidelines for the **File-Transfer** project.

This document defines how we write, review, and ship code. It is opinionated by design: consistency across the team outweighs individual preference.

---

## Table of Contents

1. [Branching model](#branching-model)
2. [Branch naming](#branch-naming)
3. [Commit messages](#commit-messages)
4. [Code review](#code-review)
5. [Definition of Done](#definition-of-done)
6. [Common pitfalls](#common-pitfalls)

---

## Branching model

We use **GitHub Flow**. It fits our context: a small team, weekly sprints, no long-lived release branches, and continuous integration into `main`.

- `main` is the only long-lived branch. It is always buildable and deployable.
- All work happens on short-lived branches created from `main`.
- Direct pushes to `main` are rejected by branch protection rules.
- Every change reaches `main` through a reviewed Pull Request.

We considered Git Flow and rejected it: the overhead of `develop`, `release/*`, and `hotfix/*` branches is not justified for a 4-person project shipping weekly.

---

## Branch naming

Format: `<type>/<JIRA-KEY>-<short-kebab-description>`

| Type       | Purpose                                        |
|------------|------------------------------------------------|
| `feature/` | New user-facing capability                     |
| `fix/`     | Bug fix                                        |
| `chore/`   | Tooling, configuration, dependencies           |
| `docs/`    | Documentation only                             |
| `refactor/`| Internal change, no behavior modification      |

The Jira key is **mandatory**. It is how commits, branches, and pull requests are automatically linked to the corresponding ticket in Jira via the GitHub for Atlassian integration.

**Example:**
*feature/FT-08-multipart-upload-endpoint*

---

## Commit messages
Format: `<JIRA-KEY> <imperative summary, <=72 chars>`

Write in the imperative present tense — the same convention used by the Linux kernel and the Angular project.

**Do:**
*FT-08 add multipart upload endpoint with 10MB limit*

**Do not:** 
*no Jira key, non-descriptive*

### Merging

- **Squash-merge only.** Merge commits and rebase-merges are disabled at the repository level.
- One PR = one commit on `main`. History stays linear and revertable.
- Head branches are deleted automatically after merge.

## Code review

### Reviewer responsibilities

A review is not a rubber stamp. Before approving, verify:

- The PR does what its description claims — nothing more, nothing less.
- Naming, structure, and formatting follow project conventions.
- Error paths are handled, not just the happy path.
- No secrets, credentials, or personal data are committed.
- Tests cover the change where meaningful.

## Definition of Done

A ticket is Done when **all** of the following are true:

- [ ] Code is merged into `main` through a reviewed PR.
- [ ] Manual test scenarios from the ticket pass.
- [ ] Documentation is updated when behavior or setup changes.
- [ ] No secrets, `.env` files, or generated artifacts are committed.
- [ ] The Jira ticket is transitioned to the correct status.

---
## Common pitfalls

Issues we have already hit or expect to hit. Read this before opening your first PR.

### Spring Boot rejects large uploads with HTTP 413

Default `MultipartFile` limits are ~1 MB. Configure explicitly in `application.yml`:

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB
```

Applies from Phase 1 onward. Revisit for Phase 2 chunking.

### CORS errors between Angular (`:4200`) and Spring Boot (`:8080`)

Cross-origin requests are blocked by default. Configure a global `CorsConfiguration` on the backend rather than sprinkling `@CrossOrigin` on individual controllers. Restrict origins to `localhost:4200` in development; **never** ship `allowedOrigins("*")` to production.

### Secrets leaking into commits

`.env` files are gitignored, but only if they were never tracked. If you commit a secret by mistake:

1. Rotate the secret immediately. Git history is public forever, even after deletion.
2. Do not rely on `git rm` alone. Use `git filter-repo` or contact the PM to force a history rewrite.

### WebSocket disconnects on network changes (Phase 2)

Browsers silently drop WebSocket connections when switching Wi-Fi or losing signal. The client must implement reconnection with exponential backoff. Do not assume `onclose` means the user left.

### Chunk reassembly race conditions (Phase 2)

Chunks may arrive out of order. Do not concatenate them in receive order — index them, then assemble once all indices are present. Persist partial state so an interrupted upload can resume.

### WebRTC works locally, fails across networks (Phase 3)

`localhost` and same-LAN peers do not require STUN/TURN. As soon as you test across NATs, connections will fail without proper ICE configuration. Test early with peers on different networks — do not discover this at the demo.

---
