-- Syntra - Advanced Business Intelligence Platform
-- Database initialization script with comprehensive schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database (this runs if database doesn't exist)
-- The database creation is handled by the Docker container initialization

-- Create enum types
DO $$ BEGIN
    CREATE TYPE connector_type AS ENUM ('csv', 'postgresql', 'mysql', 'bigquery', 'snowflake', 'excel', 'json', 'rest_api');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dataset_status AS ENUM ('pending', 'processing', 'ready', 'error', 'refreshing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_type AS ENUM ('export_png', 'export_pdf', 'data_refresh', 'dataset_import', 'report_snapshot', 'email_report');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_role AS ENUM ('owner', 'editor', 'viewer', 'contributor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_object_type AS ENUM ('workspace', 'dataset', 'report', 'dashboard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tables in dependency order

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Profile fields
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    locale VARCHAR(10) DEFAULT 'en' NOT NULL,
    
    -- OAuth fields
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    oauth_data JSONB,
    
    -- Preferences
    preferences JSONB DEFAULT '{}' NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE
);

-- Create indexes on users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Settings
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    allow_external_sharing BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on workspaces table
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);

-- Datasets table
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Connector configuration
    connector_type connector_type NOT NULL,
    connector_config JSONB NOT NULL,
    
    -- Schema and data info
    schema_json JSONB,
    sample_rows JSONB,
    row_count INTEGER,
    file_size INTEGER,
    
    -- Processing status
    status dataset_status DEFAULT 'pending' NOT NULL,
    error_message TEXT,
    
    -- File storage
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    
    -- Refresh configuration
    refresh_enabled BOOLEAN DEFAULT FALSE,
    refresh_schedule JSONB,
    last_refresh TIMESTAMP WITH TIME ZONE,
    next_refresh TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on datasets table
CREATE INDEX IF NOT EXISTS idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_connector_type ON datasets(connector_type);

-- Tables table (for dataset schema)
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    
    -- Schema information
    columns JSONB NOT NULL,
    primary_key JSONB,
    indexes JSONB,
    
    -- Statistics
    row_count INTEGER,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on tables table
CREATE INDEX IF NOT EXISTS idx_tables_dataset ON tables(dataset_id);
CREATE INDEX IF NOT EXISTS idx_tables_name ON tables(name);

-- Data models table
CREATE TABLE IF NOT EXISTS data_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    
    -- Model definition
    definition_json JSONB NOT NULL,
    
    -- Version tracking
    version INTEGER DEFAULT 1 NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on data_models table
CREATE INDEX IF NOT EXISTS idx_data_models_workspace ON data_models(workspace_id);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Report definition
    report_json JSONB NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    
    -- Publishing and sharing
    is_published BOOLEAN DEFAULT FALSE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    allow_embedding BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Snapshots and exports
    thumbnail_url VARCHAR(500),
    last_snapshot TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes on reports table
CREATE INDEX IF NOT EXISTS idx_reports_workspace ON reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reports_owner ON reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_dataset ON reports(dataset_id);
CREATE INDEX IF NOT EXISTS idx_reports_published ON reports(is_published);

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dashboard definition
    dashboard_json JSONB NOT NULL,
    
    -- Publishing and sharing
    is_published BOOLEAN DEFAULT FALSE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    allow_embedding BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- Display settings
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    auto_refresh_interval INTEGER,
    
    -- Snapshots and exports
    thumbnail_url VARCHAR(500),
    last_snapshot TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes on dashboards table
CREATE INDEX IF NOT EXISTS idx_dashboards_workspace ON dashboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON dashboards(owner_id);

-- Dashboard tiles table
CREATE TABLE IF NOT EXISTS dashboard_tiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    title VARCHAR(255),
    
    -- Layout and positioning
    position_x INTEGER DEFAULT 0 NOT NULL,
    position_y INTEGER DEFAULT 0 NOT NULL,
    width INTEGER DEFAULT 6 NOT NULL,
    height INTEGER DEFAULT 4 NOT NULL,
    
    -- Tile configuration
    tile_json JSONB NOT NULL,
    
    -- Display settings
    show_title BOOLEAN DEFAULT TRUE NOT NULL,
    show_border BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on dashboard_tiles table
CREATE INDEX IF NOT EXISTS idx_dashboard_tiles_dashboard ON dashboard_tiles(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_tiles_report ON dashboard_tiles(report_id);

-- Report snapshots table
CREATE TABLE IF NOT EXISTS report_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Snapshot data
    version INTEGER NOT NULL,
    report_json JSONB NOT NULL,
    comment TEXT,
    
    -- File exports
    thumbnail_url VARCHAR(500),
    pdf_url VARCHAR(500),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on report_snapshots table
CREATE INDEX IF NOT EXISTS idx_report_snapshots_report ON report_snapshots(report_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_created_by ON report_snapshots(created_by);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type job_type NOT NULL,
    status job_status DEFAULT 'pending' NOT NULL,
    
    -- Job payload and configuration
    payload JSONB NOT NULL,
    result JSONB,
    
    -- Progress tracking
    progress JSONB,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    max_retries INTEGER DEFAULT 3 NOT NULL,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes on jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Object (what the permission is for)
    object_type permission_object_type NOT NULL,
    object_id UUID NOT NULL,
    
    -- Permission level
    role permission_role NOT NULL,
    
    -- Workspace context
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Grant information
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Unique constraint to prevent duplicate permissions
    UNIQUE(user_id, object_type, object_id)
);

-- Create indexes on permissions table
CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_object ON permissions(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_permissions_workspace ON permissions(workspace_id);

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_models_updated_at BEFORE UPDATE ON data_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_tiles_updated_at BEFORE UPDATE ON dashboard_tiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();