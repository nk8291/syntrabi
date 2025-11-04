-- Syntra Local Database Setup Script
-- Run this after creating the database and user

-- Connect to the syntra database first: psql -U syntra -d syntra -h localhost

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS report_snapshots CASCADE;
DROP TABLE IF EXISTS dashboard_tiles CASCADE;
DROP TABLE IF EXISTS dashboards CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS data_models CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS permission_role CASCADE;
DROP TYPE IF EXISTS permission_object_type CASCADE;
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS job_type CASCADE;
DROP TYPE IF EXISTS dataset_status CASCADE;
DROP TYPE IF EXISTS connector_type CASCADE;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE connector_type AS ENUM ('csv', 'postgresql', 'mysql', 'bigquery', 'snowflake', 'excel', 'json', 'rest_api');
CREATE TYPE dataset_status AS ENUM ('pending', 'processing', 'ready', 'error', 'refreshing');
CREATE TYPE job_type AS ENUM ('export_png', 'export_pdf', 'data_refresh', 'dataset_import', 'report_snapshot', 'email_report');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE permission_role AS ENUM ('owner', 'editor', 'viewer', 'contributor');
CREATE TYPE permission_object_type AS ENUM ('workspace', 'dataset', 'report', 'dashboard');

-- Create tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    locale VARCHAR(10) DEFAULT 'en' NOT NULL,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    oauth_data JSONB,
    preferences JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    allow_external_sharing BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    connector_type connector_type NOT NULL,
    connector_config JSONB NOT NULL,
    schema_json JSONB,
    sample_rows JSONB,
    row_count INTEGER,
    file_size INTEGER,
    status dataset_status DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    refresh_enabled BOOLEAN DEFAULT FALSE,
    refresh_schedule JSONB,
    last_refresh TIMESTAMP WITH TIME ZONE,
    next_refresh TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type job_type NOT NULL,
    status job_status DEFAULT 'pending' NOT NULL,
    payload JSONB NOT NULL,
    result JSONB,
    progress JSONB,
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    max_retries INTEGER DEFAULT 3 NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO users (email, hashed_password, name, is_admin) VALUES 
('admin@syntra.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6w8WJV3.V.', 'Admin User', true);

INSERT INTO workspaces (name, description, owner_id) VALUES 
('Default Workspace', 'Default workspace for development', (SELECT id FROM users WHERE email = 'admin@syntra.com'));

-- Grant all permissions to syntra user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO syntra;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO syntra;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO syntra;

SELECT 'Database setup completed successfully!' AS status;