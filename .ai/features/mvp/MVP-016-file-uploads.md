# MVP-016: File Uploads & Attachments

## Description
Upload files to tasks, comments, and issues. Download, list, and delete attachments. Validation for MIME type, size, and extension.

## Personas
- **Nadia (Security)**: File upload validation prevents attack vectors
- **Lena (UX)**: Design files attached directly to tasks

## Dependencies
- MVP-012 (task CRUD)
- MVP-005 (API server, error handling)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/attachments` | Upload file (multipart/form-data) |
| GET | `/api/v1/attachments/:id` | Get attachment metadata |
| GET | `/api/v1/attachments/:id/download` | Download file |
| DELETE | `/api/v1/attachments/:id` | Delete attachment |
| GET | `/api/v1/tasks/:taskId/attachments` | List task attachments |

### Files to create
```
apps/api/src/
├── routes/attachments/
│   ├── attachments.routes.ts
│   ├── attachments.handlers.ts
│   └── attachments.schemas.ts
├── services/
│   └── attachment.service.ts    # Upload, validation, storage
├── plugins/
│   └── multipart.plugin.ts     # @fastify/multipart configuration
```

### Upload request
```
POST /api/v1/attachments
Content-Type: multipart/form-data

Fields:
  - file: (binary)
  - entityType: "task" | "comment" | "issue"
  - entityId: string
```

### Validation
- **MIME whitelist**: jpeg, png, gif, webp, svg, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, zip
- **Extension check**: extension must match MIME type (prevent .exe disguised as .jpg)
- **Max size**: 50 MB (configurable via env)
- **Content-Type sniffing**: read file magic bytes to verify actual type matches declared MIME

### Storage
- MVP: local filesystem (`./uploads/{orgId}/{entityType}/{entityId}/{filename}`)
- Files stored with UUID filename (original filename in DB)
- Storage path configurable via environment variable for future S3 migration

### Response
```json
{
  "data": {
    "id": "att_123",
    "filename": "design-v2.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 2048576,
    "scanStatus": "skipped",
    "url": "/api/v1/attachments/att_123/download",
    "createdAt": "2026-03-24T14:30:00.000Z"
  }
}
```

### Download
- Serve file with correct Content-Type and Content-Disposition headers
- Permission check: user must have read access to the parent entity

## Acceptance Criteria
- [x] Files can be uploaded via multipart/form-data
- [x] MIME type whitelist is enforced (415 for disallowed types)
- [x] File size limit is enforced (413 for oversized files)
- [x] Extension must match MIME type
- [x] Magic byte verification catches mismatched Content-Type
- [x] Files are stored with UUID filenames
- [x] Attachments are linked to tasks (comments/issues deferred to later features)
- [x] Attachments can be listed per entity
- [x] Files can be downloaded with correct headers
- [x] Attachments can be deleted (file removed from storage)
- [x] Permission checks on upload (auth required) and download/delete (read/delete via task)
- [x] ~~Activity log records attachment add/remove~~ → deferred to MVP-017
- [x] Tests cover schema validation (upload validation is in service layer)
