-- 0002: persist the remote engine job identifier without changing existing rows.
-- Additive migration only; never edit an applied migration.
ALTER TABLE jobs ADD COLUMN provider_job_id TEXT;
CREATE INDEX idx_jobs_provider_job_id ON jobs (engine, provider_job_id);
