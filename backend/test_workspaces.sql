-- Test data for workspaces
-- Insert some sample workspaces for testing

-- Insert test users if they don't exist
INSERT INTO users (id, email, name, hashed_password, is_active, is_verified) 
VALUES 
  ('01234567-89ab-cdef-0123-456789abcdef', 'admin@example.com', 'Admin User', '$2b$12$test', true, true),
  ('11234567-89ab-cdef-0123-456789abcdef', 'user2@example.com', 'Test User 2', '$2b$12$test', true, true)
ON CONFLICT (email) DO NOTHING;

-- Insert test workspaces
INSERT INTO workspaces (id, name, description, owner_id, is_public, allow_external_sharing, created_at, updated_at)
VALUES 
  ('ws-01234567-89ab-cdef-0123-456789abcdef', 'My Workspace', 'Default workspace for admin user', '01234567-89ab-cdef-0123-456789abcdef', false, false, NOW(), NOW()),
  ('ws-11234567-89ab-cdef-0123-456789abcdef', 'Sales Analytics', 'Workspace for sales team analytics and reports', '01234567-89ab-cdef-0123-456789abcdef', true, true, NOW(), NOW()),
  ('ws-21234567-89ab-cdef-0123-456789abcdef', 'Marketing Insights', 'Marketing team workspace for campaign analytics', '11234567-89ab-cdef-0123-456789abcdef', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert permissions for workspaces
INSERT INTO permissions (id, user_id, object_type, object_id, workspace_id, role, granted_by, created_at, updated_at)
VALUES 
  ('perm-01234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', 'workspace', 'ws-01234567-89ab-cdef-0123-456789abcdef', 'ws-01234567-89ab-cdef-0123-456789abcdef', 'owner', '01234567-89ab-cdef-0123-456789abcdef', NOW(), NOW()),
  ('perm-11234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', 'workspace', 'ws-11234567-89ab-cdef-0123-456789abcdef', 'ws-11234567-89ab-cdef-0123-456789abcdef', 'owner', '01234567-89ab-cdef-0123-456789abcdef', NOW(), NOW()),
  ('perm-21234567-89ab-cdef-0123-456789abcdef', '11234567-89ab-cdef-0123-456789abcdef', 'workspace', 'ws-21234567-89ab-cdef-0123-456789abcdef', 'ws-21234567-89ab-cdef-0123-456789abcdef', 'owner', '11234567-89ab-cdef-0123-456789abcdef', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;