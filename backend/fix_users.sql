-- Fix user authentication for PowerBI Web Replica
-- This script creates/updates users with known passwords

-- Update existing admin user with correct password hash for 'admin123'
UPDATE users 
SET hashed_password = '$2b$12$W2qH6PWHE4t4kWylH7tJ9uhB5S8WwYColeSCa4PQycp8zSIaok.Sy'
WHERE email = 'admin@syntra.com';

-- Insert missing test users
INSERT INTO users (email, hashed_password, name, is_active, is_verified, is_admin, timezone, locale, preferences)
VALUES 
    ('admin@example.com', '$2b$12$W2qH6PWHE4t4kWylH7tJ9uhB5S8WwYColeSCa4PQycp8zSIaok.Sy', 'Admin User', true, true, true, 'UTC', 'en', '{}'),
    ('user@example.com', '$2b$12$rMK.F8qJHgNVXp6fWY9bCOzS8WmjyQEJq5qzNxMmzNlQyNzNzNzN', 'Regular User', true, true, false, 'UTC', 'en', '{}')
ON CONFLICT (email) DO UPDATE SET 
    hashed_password = EXCLUDED.hashed_password,
    is_active = true;

-- Create workspaces for new users if they don't exist
INSERT INTO workspaces (name, description, owner_id, is_public, allow_external_sharing)
SELECT 
    u.name || '''s Workspace',
    'Default workspace for ' || u.name,
    u.id,
    false,
    true
FROM users u 
WHERE u.email IN ('admin@example.com', 'user@example.com', 'admin@syntra.com')
  AND NOT EXISTS (
      SELECT 1 FROM workspaces w WHERE w.owner_id = u.id
  );

-- Show all users
SELECT email, name, is_admin, is_active, created_at FROM users;