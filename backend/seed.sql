-- PowerBI Web Replica - Sample Data Seed Script
-- Run this after initial database setup to create sample users and data

-- Create sample admin user (password: admin123)
-- This uses a pre-generated bcrypt hash for 'admin123'
INSERT INTO users (id, email, hashed_password, name, is_active, is_verified, is_admin, avatar_url, timezone, locale, preferences)
VALUES (
    uuid_generate_v4(), 
    'admin@example.com', 
    '$2b$12$W2qH6PWHE4t4kWylH7tJ9uhB5S8WwYColeSCa4PQycp8zSIaok.Sy', 
    'Admin User', 
    true, 
    true, 
    true, 
    null, 
    'UTC', 
    'en', 
    '{}'
) ON CONFLICT (email) DO NOTHING;

-- Create sample regular user (password: user123)
INSERT INTO users (id, email, hashed_password, name, is_active, is_verified, is_admin, avatar_url, timezone, locale, preferences)
VALUES (
    uuid_generate_v4(), 
    'user@example.com', 
    '$2b$12$rMK.F8qJHgNVXp6fWY9bCOzS8WmjyQEJq5qzNxMmzNlQyNzNzNzN', 
    'Regular User', 
    true, 
    true, 
    false, 
    null, 
    'UTC', 
    'en', 
    '{}'
) ON CONFLICT (email) DO NOTHING;

-- Create default workspaces for each user
INSERT INTO workspaces (id, name, description, owner_id, is_public, allow_external_sharing)
SELECT 
    uuid_generate_v4(), 
    u.name || '''s Workspace', 
    'Default workspace for ' || u.name, 
    u.id, 
    false, 
    true
FROM users u 
WHERE u.email IN ('admin@example.com', 'user@example.com')
ON CONFLICT DO NOTHING;

-- Insert sample dataset (CSV type)
INSERT INTO datasets (id, workspace_id, name, description, connector_type, status, connection_config, schema_json, row_count, file_size)
SELECT 
    uuid_generate_v4(),
    w.id,
    'Sales Data',
    'Sample sales dataset with historical data',
    'csv',
    'ready',
    '{"file_path": "/app/examples/datasets/sales.csv"}',
    '{"columns": [
        {"name": "date", "type": "date"},
        {"name": "product", "type": "string"},
        {"name": "category", "type": "string"},
        {"name": "sales", "type": "number"},
        {"name": "profit", "type": "number"},
        {"name": "region", "type": "string"}
    ]}',
    35,
    2048
FROM workspaces w
JOIN users u ON u.id = w.owner_id
WHERE u.email = 'admin@example.com'
LIMIT 1;

-- Insert sample report
INSERT INTO reports (id, workspace_id, owner_id, dataset_id, name, description, report_json, is_published)
SELECT 
    uuid_generate_v4(),
    w.id,
    u.id,
    d.id,
    'Sales Dashboard',
    'Interactive sales dashboard showing key metrics and trends',
    '{
        "version": "1.0",
        "layout": {
            "width": 1200,
            "height": 800
        },
        "visualizations": [
            {
                "id": "chart1",
                "type": "bar",
                "title": "Sales by Category",
                "position": {"x": 0, "y": 0, "width": 6, "height": 4},
                "config": {
                    "x_field": "category",
                    "y_field": "sales",
                    "color_field": "category"
                }
            },
            {
                "id": "chart2", 
                "type": "line",
                "title": "Sales Trend Over Time",
                "position": {"x": 6, "y": 0, "width": 6, "height": 4},
                "config": {
                    "x_field": "date",
                    "y_field": "sales",
                    "color_field": "region"
                }
            }
        ]
    }',
    true
FROM workspaces w
JOIN users u ON u.id = w.owner_id
JOIN datasets d ON d.workspace_id = w.id
WHERE u.email = 'admin@example.com'
AND d.name = 'Sales Data'
LIMIT 1;

COMMIT;

-- Display created users for verification
SELECT 'Created users:' as message;
SELECT email, name, is_admin, is_active FROM users WHERE email IN ('admin@example.com', 'user@example.com');

SELECT 'Created workspaces:' as message;  
SELECT w.name, u.email as owner_email FROM workspaces w 
JOIN users u ON u.id = w.owner_id 
WHERE u.email IN ('admin@example.com', 'user@example.com');