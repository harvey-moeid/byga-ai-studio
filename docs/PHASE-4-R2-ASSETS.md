# Phase 4.2 — Private R2 asset storage

- Dedicated APAC bucket: `byga-ai-studio-assets`.
- Worker binding: `R2_ASSETS`.
- Upload: authenticated multipart `POST /api/v1/assets/upload`, 25 MiB maximum, MIME allowlist, safe filename, SHA-256 checksum.
- Object key: `projects/{projectId}/assets/{assetId}/{filename}`.
- D1 stores metadata and object key; legacy metadata-only assets remain supported.
- Download: authenticated `GET /api/v1/assets/{assetId}/content`; no public bucket URL.
- Delete removes the R2 object before its D1 metadata; on R2 failure metadata is retained.
- Production Worker configuration has the R2 binding in source but is not deployed by this change. Production migration and deployment remain owner-gated.