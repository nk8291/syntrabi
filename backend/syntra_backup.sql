--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.workspaces DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tables DROP CONSTRAINT IF EXISTS tables_dataset_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_workspace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_dataset_id_fkey;
ALTER TABLE IF EXISTS ONLY public.report_snapshots DROP CONSTRAINT IF EXISTS report_snapshots_report_id_fkey;
ALTER TABLE IF EXISTS ONLY public.report_snapshots DROP CONSTRAINT IF EXISTS report_snapshots_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_workspace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_granted_by_fkey;
ALTER TABLE IF EXISTS ONLY public.datasets DROP CONSTRAINT IF EXISTS datasets_workspace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.data_models DROP CONSTRAINT IF EXISTS data_models_workspace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dashboards DROP CONSTRAINT IF EXISTS dashboards_workspace_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dashboards DROP CONSTRAINT IF EXISTS dashboards_owner_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dashboard_tiles DROP CONSTRAINT IF EXISTS dashboard_tiles_report_id_fkey;
ALTER TABLE IF EXISTS ONLY public.dashboard_tiles DROP CONSTRAINT IF EXISTS dashboard_tiles_dashboard_id_fkey;
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
DROP TRIGGER IF EXISTS update_datasets_updated_at ON public.datasets;
DROP INDEX IF EXISTS public.ix_tables_id;
DROP INDEX IF EXISTS public.ix_reports_name;
DROP INDEX IF EXISTS public.ix_reports_id;
DROP INDEX IF EXISTS public.ix_report_snapshots_id;
DROP INDEX IF EXISTS public.ix_permissions_workspace_id;
DROP INDEX IF EXISTS public.ix_permissions_user_id;
DROP INDEX IF EXISTS public.ix_permissions_object_type;
DROP INDEX IF EXISTS public.ix_permissions_object_id;
DROP INDEX IF EXISTS public.ix_permissions_id;
DROP INDEX IF EXISTS public.ix_data_models_name;
DROP INDEX IF EXISTS public.ix_data_models_id;
DROP INDEX IF EXISTS public.ix_dashboards_name;
DROP INDEX IF EXISTS public.ix_dashboards_id;
DROP INDEX IF EXISTS public.ix_dashboard_tiles_id;
DROP INDEX IF EXISTS public.idx_workspaces_owner;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_jobs_type;
DROP INDEX IF EXISTS public.idx_jobs_status;
DROP INDEX IF EXISTS public.idx_datasets_workspace;
DROP INDEX IF EXISTS public.idx_datasets_status;
ALTER TABLE IF EXISTS ONLY public.workspaces DROP CONSTRAINT IF EXISTS workspaces_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.tables DROP CONSTRAINT IF EXISTS tables_pkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_pkey;
ALTER TABLE IF EXISTS ONLY public.report_snapshots DROP CONSTRAINT IF EXISTS report_snapshots_pkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.jobs DROP CONSTRAINT IF EXISTS jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.datasets DROP CONSTRAINT IF EXISTS datasets_pkey;
ALTER TABLE IF EXISTS ONLY public.data_models DROP CONSTRAINT IF EXISTS data_models_pkey;
ALTER TABLE IF EXISTS ONLY public.dashboards DROP CONSTRAINT IF EXISTS dashboards_pkey;
ALTER TABLE IF EXISTS ONLY public.dashboard_tiles DROP CONSTRAINT IF EXISTS dashboard_tiles_pkey;
ALTER TABLE IF EXISTS ONLY public.permissions DROP CONSTRAINT IF EXISTS _user_object_permission_uc;
DROP TABLE IF EXISTS public.workspaces;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tables;
DROP TABLE IF EXISTS public.reports;
DROP TABLE IF EXISTS public.report_snapshots;
DROP TABLE IF EXISTS public.permissions;
DROP TABLE IF EXISTS public.jobs;
DROP TABLE IF EXISTS public.datasets;
DROP TABLE IF EXISTS public.data_models;
DROP TABLE IF EXISTS public.dashboards;
DROP TABLE IF EXISTS public.dashboard_tiles;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP TYPE IF EXISTS public.permission_role;
DROP TYPE IF EXISTS public.permission_object_type;
DROP TYPE IF EXISTS public.jobtype;
DROP TYPE IF EXISTS public.jobstatus;
DROP TYPE IF EXISTS public.job_type;
DROP TYPE IF EXISTS public.job_status;
DROP TYPE IF EXISTS public.dataset_status;
DROP TYPE IF EXISTS public.connector_type;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: connector_type; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.connector_type AS ENUM (
    'csv',
    'postgresql',
    'mysql',
    'bigquery',
    'snowflake',
    'excel',
    'json',
    'rest_api'
);


ALTER TYPE public.connector_type OWNER TO syntra;

--
-- Name: dataset_status; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.dataset_status AS ENUM (
    'pending',
    'processing',
    'ready',
    'error',
    'refreshing'
);


ALTER TYPE public.dataset_status OWNER TO syntra;

--
-- Name: job_status; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.job_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE public.job_status OWNER TO syntra;

--
-- Name: job_type; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.job_type AS ENUM (
    'export_png',
    'export_pdf',
    'data_refresh',
    'dataset_import',
    'report_snapshot',
    'email_report'
);


ALTER TYPE public.job_type OWNER TO syntra;

--
-- Name: jobstatus; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.jobstatus AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public.jobstatus OWNER TO syntra;

--
-- Name: jobtype; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.jobtype AS ENUM (
    'EXPORT_PNG',
    'EXPORT_PDF',
    'DATA_REFRESH',
    'DATASET_IMPORT',
    'REPORT_SNAPSHOT',
    'EMAIL_REPORT'
);


ALTER TYPE public.jobtype OWNER TO syntra;

--
-- Name: permission_object_type; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.permission_object_type AS ENUM (
    'workspace',
    'dataset',
    'report',
    'dashboard'
);


ALTER TYPE public.permission_object_type OWNER TO syntra;

--
-- Name: permission_role; Type: TYPE; Schema: public; Owner: syntra
--

CREATE TYPE public.permission_role AS ENUM (
    'owner',
    'editor',
    'viewer',
    'contributor'
);


ALTER TYPE public.permission_role OWNER TO syntra;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: syntra
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO syntra;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dashboard_tiles; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.dashboard_tiles (
    id uuid NOT NULL,
    dashboard_id uuid NOT NULL,
    report_id uuid,
    title character varying(255),
    position_x integer NOT NULL,
    position_y integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    tile_json json NOT NULL,
    show_title boolean NOT NULL,
    show_border boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dashboard_tiles OWNER TO syntra;

--
-- Name: dashboards; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.dashboards (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    workspace_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    dashboard_json json NOT NULL,
    is_published boolean NOT NULL,
    is_public boolean NOT NULL,
    allow_embedding boolean NOT NULL,
    theme character varying(50) NOT NULL,
    auto_refresh_interval integer,
    thumbnail_url character varying(500),
    last_snapshot timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone
);


ALTER TABLE public.dashboards OWNER TO syntra;

--
-- Name: data_models; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.data_models (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(1000),
    workspace_id uuid NOT NULL,
    definition_json json NOT NULL,
    version character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_models OWNER TO syntra;

--
-- Name: datasets; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.datasets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    connector_type public.connector_type NOT NULL,
    connector_config jsonb NOT NULL,
    schema_json jsonb,
    sample_rows jsonb,
    row_count integer,
    file_size integer,
    status public.dataset_status DEFAULT 'pending'::public.dataset_status NOT NULL,
    error_message text,
    file_path character varying(500),
    file_url character varying(500),
    refresh_enabled boolean DEFAULT false,
    refresh_schedule jsonb,
    last_refresh timestamp with time zone,
    next_refresh timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.datasets OWNER TO syntra;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.job_type NOT NULL,
    status public.job_status DEFAULT 'pending'::public.job_status NOT NULL,
    payload jsonb NOT NULL,
    result jsonb,
    progress jsonb,
    error_message text,
    error_details jsonb,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.jobs OWNER TO syntra;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    object_type public.permission_object_type NOT NULL,
    object_id uuid NOT NULL,
    role public.permission_role NOT NULL,
    workspace_id uuid,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO syntra;

--
-- Name: report_snapshots; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.report_snapshots (
    id uuid NOT NULL,
    report_id uuid NOT NULL,
    created_by uuid NOT NULL,
    version integer NOT NULL,
    report_json json NOT NULL,
    comment text,
    thumbnail_url character varying(500),
    pdf_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.report_snapshots OWNER TO syntra;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.reports (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    workspace_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    dataset_id uuid,
    report_json json NOT NULL,
    version integer NOT NULL,
    is_published boolean NOT NULL,
    is_public boolean NOT NULL,
    allow_embedding boolean NOT NULL,
    thumbnail_url character varying(500),
    last_snapshot timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone
);


ALTER TABLE public.reports OWNER TO syntra;

--
-- Name: tables; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.tables (
    id uuid NOT NULL,
    dataset_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    display_name character varying(255),
    description text,
    columns json NOT NULL,
    primary_key json,
    indexes json,
    row_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tables OWNER TO syntra;

--
-- Name: users; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    name character varying(255) NOT NULL,
    avatar_url character varying(500),
    timezone character varying(50) DEFAULT 'UTC'::character varying NOT NULL,
    locale character varying(10) DEFAULT 'en'::character varying NOT NULL,
    oauth_provider character varying(50),
    oauth_id character varying(255),
    oauth_data jsonb,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login timestamp with time zone,
    last_seen timestamp with time zone
);


ALTER TABLE public.users OWNER TO syntra;

--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: syntra
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    allow_external_sharing boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspaces OWNER TO syntra;

--
-- Data for Name: dashboard_tiles; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.dashboard_tiles (id, dashboard_id, report_id, title, position_x, position_y, width, height, tile_json, show_title, show_border, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dashboards; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.dashboards (id, name, description, workspace_id, owner_id, dashboard_json, is_published, is_public, allow_embedding, theme, auto_refresh_interval, thumbnail_url, last_snapshot, created_at, updated_at, published_at) FROM stdin;
\.


--
-- Data for Name: data_models; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.data_models (id, name, description, workspace_id, definition_json, version, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: datasets; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.datasets (id, workspace_id, name, description, connector_type, connector_config, schema_json, sample_rows, row_count, file_size, status, error_message, file_path, file_url, refresh_enabled, refresh_schedule, last_refresh, next_refresh, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.jobs (id, type, status, payload, result, progress, error_message, error_details, retry_count, max_retries, scheduled_at, started_at, completed_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.permissions (id, user_id, object_type, object_id, role, workspace_id, granted_by, granted_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: report_snapshots; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.report_snapshots (id, report_id, created_by, version, report_json, comment, thumbnail_url, pdf_url, created_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.reports (id, name, description, workspace_id, owner_id, dataset_id, report_json, version, is_published, is_public, allow_embedding, thumbnail_url, last_snapshot, created_at, updated_at, published_at) FROM stdin;
\.


--
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.tables (id, dataset_id, name, display_name, description, columns, primary_key, indexes, row_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.users (id, email, hashed_password, is_active, is_verified, is_admin, name, avatar_url, timezone, locale, oauth_provider, oauth_id, oauth_data, preferences, created_at, updated_at, last_login, last_seen) FROM stdin;
46ee9d89-eea3-414c-94d2-9c487ee54935	admin@syntra.com	$2b$12$W2qH6PWHE4t4kWylH7tJ9uhB5S8WwYColeSCa4PQycp8zSIaok.Sy	t	f	t	Admin User	\N	UTC	en	\N	\N	\N	{}	2025-08-31 22:54:49.887174-04	2025-09-01 01:04:12.66249-04	\N	\N
6d3ac59e-734d-4251-a934-3835d4d4ad44	admin@example.com	$2b$12$W2qH6PWHE4t4kWylH7tJ9uhB5S8WwYColeSCa4PQycp8zSIaok.Sy	t	t	t	Admin User	\N	UTC	en	\N	\N	\N	{}	2025-09-01 01:04:12.677773-04	2025-09-01 01:04:12.677773-04	\N	\N
a544c378-398c-424f-9076-f0d813343b6e	user@example.com	$2b$12$rMK.F8qJHgNVXp6fWY9bCOzS8WmjyQEJq5qzNxMmzNlQyNzNzNzN	t	t	f	Regular User	\N	UTC	en	\N	\N	\N	{}	2025-09-01 01:04:12.677773-04	2025-09-01 01:04:12.677773-04	\N	\N
\.


--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: syntra
--

COPY public.workspaces (id, name, description, owner_id, is_public, allow_external_sharing, created_at, updated_at) FROM stdin;
77e9b2e7-d988-4adc-a739-eb81ee26b147	Default Workspace	Default workspace for development	46ee9d89-eea3-414c-94d2-9c487ee54935	f	f	2025-08-31 22:54:49.892602-04	2025-08-31 22:54:49.892602-04
9ee43cca-c120-4bf8-8525-42288e787e1e	Admin User's Workspace	Default workspace for Admin User	6d3ac59e-734d-4251-a934-3835d4d4ad44	f	t	2025-09-01 01:04:12.683858-04	2025-09-01 01:04:12.683858-04
058887eb-a6c0-4f96-a52f-5cdfd0c129be	Regular User's Workspace	Default workspace for Regular User	a544c378-398c-424f-9076-f0d813343b6e	f	t	2025-09-01 01:04:12.683858-04	2025-09-01 01:04:12.683858-04
\.


--
-- Name: permissions _user_object_permission_uc; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT _user_object_permission_uc UNIQUE (user_id, object_type, object_id);


--
-- Name: dashboard_tiles dashboard_tiles_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.dashboard_tiles
    ADD CONSTRAINT dashboard_tiles_pkey PRIMARY KEY (id);


--
-- Name: dashboards dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_pkey PRIMARY KEY (id);


--
-- Name: data_models data_models_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.data_models
    ADD CONSTRAINT data_models_pkey PRIMARY KEY (id);


--
-- Name: datasets datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: report_snapshots report_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: idx_datasets_status; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX idx_datasets_status ON public.datasets USING btree (status);


--
-- Name: idx_datasets_workspace; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX idx_datasets_workspace ON public.datasets USING btree (workspace_id);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_jobs_type; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX idx_jobs_type ON public.jobs USING btree (type);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_workspaces_owner; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX idx_workspaces_owner ON public.workspaces USING btree (owner_id);


--
-- Name: ix_dashboard_tiles_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_dashboard_tiles_id ON public.dashboard_tiles USING btree (id);


--
-- Name: ix_dashboards_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_dashboards_id ON public.dashboards USING btree (id);


--
-- Name: ix_dashboards_name; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_dashboards_name ON public.dashboards USING btree (name);


--
-- Name: ix_data_models_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_data_models_id ON public.data_models USING btree (id);


--
-- Name: ix_data_models_name; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_data_models_name ON public.data_models USING btree (name);


--
-- Name: ix_permissions_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_permissions_id ON public.permissions USING btree (id);


--
-- Name: ix_permissions_object_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_permissions_object_id ON public.permissions USING btree (object_id);


--
-- Name: ix_permissions_object_type; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_permissions_object_type ON public.permissions USING btree (object_type);


--
-- Name: ix_permissions_user_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_permissions_user_id ON public.permissions USING btree (user_id);


--
-- Name: ix_permissions_workspace_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_permissions_workspace_id ON public.permissions USING btree (workspace_id);


--
-- Name: ix_report_snapshots_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_report_snapshots_id ON public.report_snapshots USING btree (id);


--
-- Name: ix_reports_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_reports_id ON public.reports USING btree (id);


--
-- Name: ix_reports_name; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_reports_name ON public.reports USING btree (name);


--
-- Name: ix_tables_id; Type: INDEX; Schema: public; Owner: syntra
--

CREATE INDEX ix_tables_id ON public.tables USING btree (id);


--
-- Name: datasets update_datasets_updated_at; Type: TRIGGER; Schema: public; Owner: syntra
--

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: syntra
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: syntra
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces update_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: syntra
--

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dashboard_tiles dashboard_tiles_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.dashboard_tiles
    ADD CONSTRAINT dashboard_tiles_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.dashboards(id);


--
-- Name: dashboard_tiles dashboard_tiles_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.dashboard_tiles
    ADD CONSTRAINT dashboard_tiles_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);


--
-- Name: dashboards dashboards_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: dashboards dashboards_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: data_models data_models_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.data_models
    ADD CONSTRAINT data_models_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: datasets datasets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: permissions permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: permissions permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: permissions permissions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: report_snapshots report_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: report_snapshots report_snapshots_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.report_snapshots
    ADD CONSTRAINT report_snapshots_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);


--
-- Name: reports reports_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id);


--
-- Name: reports reports_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: reports reports_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: tables tables_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id);


--
-- Name: workspaces workspaces_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: syntra
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO syntra;


--
-- PostgreSQL database dump complete
--

