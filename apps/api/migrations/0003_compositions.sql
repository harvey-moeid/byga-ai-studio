-- 0003_compositions: Studio-owned, immutable composition source versions.
-- Apply only after explicit owner approval through the D1 migrations workflow.
CREATE TABLE compositions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  engine TEXT NOT NULL CHECK (engine IN ('hyperframes', 'remotion')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_compositions_project_updated ON compositions(project_id, archived, updated_at DESC);
CREATE TABLE composition_versions (
  id TEXT PRIMARY KEY,
  composition_id TEXT NOT NULL REFERENCES compositions(id),
  version INTEGER NOT NULL CHECK (version >= 1),
  r2_key TEXT NOT NULL UNIQUE,
  size INTEGER NOT NULL CHECK (size > 0 AND size <= 262144),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(composition_id, version)
);
CREATE INDEX idx_composition_versions_lookup ON composition_versions(composition_id, version DESC);
