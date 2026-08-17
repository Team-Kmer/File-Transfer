## Jira ticket

<!-- Link to the ticket, e.g. https://studmail-team-n0kmfbty.atlassian.net/jira/software/projects/FT/boards/67/backlog -->

Closes FT-XX

## Description

*<!-- What does this PR change, and why? ->*

## How to test

*<!-- Reproducible steps to validate the change ->*

1.
2.
3.

**Expected result:**

## Checklist

- [ ] Tested locally
- [ ] Branch name follows convention (`<type>/FT-XX-...`)
- [ ] Commit messages include the Jira key
- [ ] Documentation updated where relevant
- [ ] No secrets or sensitive files committed
- [ ] Not opened on Friday evening

## For Example
### Jira ticket
Closes FT-03 (maybe about uploading an endpoint)

### Description
Adds POST /api/files/upload endpoint using Spring's MultipartFile.
Files are stored in a local `uploads/` directory (temporary storage for MVP).
Includes size validation (max 10MB) and returns 413 with a clear error
message when exceeded.

### How to test
1. Start backend: `cd backend && ./mvnw spring-boot:run`
2. Send a file with curl:
   `curl -F "file=@test.pdf" http://localhost:8080/api/files/upload`
3. Verify the file appears in `uploads/` directory
4. Try uploading a 15MB file → should return HTTP 413

**Expected result:** File saved successfully, 413 returned for oversized files.

### Checklist
- [x] Tested locally
- [x] Branch name follows convention
- [x] Commit messages include the Jira key
- [x] Documentation updated where relevant
- [x] No secrets or sensitive files committed