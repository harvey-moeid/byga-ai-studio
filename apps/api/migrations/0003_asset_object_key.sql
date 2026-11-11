-- 0003: bind asset metadata to private R2 objects. Existing metadata-only rows remain valid.
ALTER TABLE assets ADD COLUMN object_key TEXT;
CREATE UNIQUE INDEX idx_assets_object_key ON assets (object_key) WHERE object_key IS NOT NULL;
