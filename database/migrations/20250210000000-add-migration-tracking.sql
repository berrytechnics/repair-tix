-- Migration tracking table
-- This table tracks which migrations have been applied to prevent duplicate runs
-- NOTE: This table is now created in the base schema migration (20240101000000-base-schema.sql)
-- This migration is kept for backward compatibility and is safe to run multiple times (idempotent)

-- Create table if it doesn't exist (already created in base schema, but safe to run)
CREATE TABLE IF NOT EXISTS schema_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- Create indexes if they don't exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations(filename);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- Add comment (idempotent - will update comment if table exists)
COMMENT ON TABLE schema_migrations IS 'Tracks database migrations to prevent duplicate execution';



