-- 0001_init: Phase 3 persistence baseline (projects, asset metadata, jobs).
-- Additive migrations only; never edit an applied migration.

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_projects_updated_at ON projects (updated_at DESC);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 26214400),
  type TEXT NOT NULL CHECK (type IN ('image', 'audio', 'video', 'document', 'other')),
  checksum TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_assets_project_created ON assets (project_id, created_at DESC);
CREATE INDEX idx_assets_created_at ON assets (created_at DESC);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id),
  engine TEXT NOT NULL CHECK (engine IN ('hyperframes', 'remotion', 'suara', 'mcpnew')),
  operation TEXT NOT NULL CHECK (length(operation) BETWEEN 1 AND 80),
  state TEXT NOT NULL CHECK (state IN ('submitted', 'queued', 'running', 'succeeded', 'failed', 'cancelled')),
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_jobs_project_created ON jobs (project_id, created_at DESC);
CREATE INDEX idx_jobs_created_at ON jobs (created_at DESC);
CREATE INDEX idx_jobs_state ON jobs (state);
