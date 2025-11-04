-- Add comprehensive Power BI-style connector types
-- Based on: https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-data-sources

-- First, add new enum values to connector_type
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'sql_server';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'oracle';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'teradata';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'google_bigquery';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'mariadb';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'mongodb';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'azure_sql';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'web';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'spark';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'odbc';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'ole_db';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'fhir';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'google_sheets';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'blank_query';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'text_csv';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'xml';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'folder';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'pdf';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'parquet';
ALTER TYPE connector_type ADD VALUE IF NOT EXISTS 'sharepoint_folder';

-- Also expand dataset_status for better workflow management
ALTER TYPE dataset_status ADD VALUE IF NOT EXISTS 'importing';
ALTER TYPE dataset_status ADD VALUE IF NOT EXISTS 'analyzing';
ALTER TYPE dataset_status ADD VALUE IF NOT EXISTS 'failed_import';
ALTER TYPE dataset_status ADD VALUE IF NOT EXISTS 'failed_analysis';