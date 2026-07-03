CREATE EXTENSION IF NOT EXISTS pg_trgm;


CREATE TABLE IF NOT EXISTS sync_sources (
    id BIGSERIAL PRIMARY KEY,

    source_type TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,

    -- majdocty_exact hoặc docty_exact
    filter_field TEXT NOT NULL,
    filter_value TEXT NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sync_sources (
    source_type,
    name,
    filter_field,
    filter_value
)
VALUES
(
    'PROJECT_DOCUMENTS',
    'Project Documents',
    'majdocty_exact',
    'Project Documents'
),
(
    'PUBLICATIONS_RESEARCH',
    'Publications & Research',
    'majdocty_exact',
    'Publications & Research'
)
ON CONFLICT (source_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS dim_country (
    country_key TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    region TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_country_region
ON dim_country(region);

CREATE TABLE IF NOT EXISTS dim_doc_type (
    doc_type_key TEXT PRIMARY KEY,
    doc_type_name TEXT NOT NULL,
    major_doc_type TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_doc_type_major
ON dim_doc_type(major_doc_type);


CREATE TABLE IF NOT EXISTS dim_theme (
    id BIGSERIAL PRIMARY KEY,
    theme_name TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,

    source_type TEXT NOT NULL,

    api_document_key TEXT,

    display_title TEXT,
    doc_name TEXT,
    report_number TEXT,

    doc_date TIMESTAMPTZ,
    disclosure_date TIMESTAMPTZ,
    last_modified_date TIMESTAMPTZ,
    date_stored TIMESTAMPTZ,

    doc_type TEXT,
    doc_type_key TEXT,
    major_doc_type TEXT,

    country TEXT,
    country_key TEXT,
    region TEXT,

    project_id TEXT,
    project_name TEXT,

    language TEXT,

    theme TEXT,
    lending_instrument TEXT,
    product_line TEXT,

    security_class TEXT,
    disclosure_status TEXT,
    version_type TEXT,

    no_of_pages INT,

    pdf_url TEXT,
    txt_url TEXT,
    record_url TEXT,

    abstract TEXT,
    authors TEXT[],

    raw_json JSONB NOT NULL,

    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_documents_country
        FOREIGN KEY (country_key)
        REFERENCES dim_country(country_key)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_documents_doc_type
        FOREIGN KEY (doc_type_key)
        REFERENCES dim_doc_type(doc_type_key)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_source_type
ON documents(source_type);

CREATE INDEX IF NOT EXISTS idx_documents_doc_date
ON documents(doc_date);

CREATE INDEX IF NOT EXISTS idx_documents_disclosure_date
ON documents(disclosure_date);

CREATE INDEX IF NOT EXISTS idx_documents_last_modified_date
ON documents(last_modified_date);

CREATE INDEX IF NOT EXISTS idx_documents_country_key
ON documents(country_key);

CREATE INDEX IF NOT EXISTS idx_documents_region
ON documents(region);

CREATE INDEX IF NOT EXISTS idx_documents_major_doc_type
ON documents(major_doc_type);

CREATE INDEX IF NOT EXISTS idx_documents_doc_type
ON documents(doc_type);

CREATE INDEX IF NOT EXISTS idx_documents_language
ON documents(language);

CREATE INDEX IF NOT EXISTS idx_documents_project_id
ON documents(project_id);

CREATE INDEX IF NOT EXISTS idx_documents_raw_json
ON documents USING GIN(raw_json);

CREATE INDEX IF NOT EXISTS idx_documents_display_title_trgm
ON documents USING GIN(display_title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS document_themes (
    document_id TEXT NOT NULL,
    theme_id BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (document_id, theme_id),

    CONSTRAINT fk_document_themes_document
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_document_themes_theme
        FOREIGN KEY (theme_id)
        REFERENCES dim_theme(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_themes_theme_id
ON document_themes(theme_id);


CREATE TABLE IF NOT EXISTS sync_jobs (
    id BIGSERIAL PRIMARY KEY,

    source_type TEXT NOT NULL,

    params JSONB NOT NULL DEFAULT '{}'::jsonb,

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'RUNNING',
                'COMPLETED',
                'FAILED',
                'CANCELLED'
            )
        ),

    target_limit INT NOT NULL DEFAULT 10000
        CHECK (target_limit > 0 AND target_limit <= 10000),

    total_available INT NOT NULL DEFAULT 0,

    fetched INT NOT NULL DEFAULT 0,
    inserted INT NOT NULL DEFAULT 0,
    updated INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,

    current_offset INT NOT NULL DEFAULT 0,

    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,

    error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sync_jobs_source_type
        FOREIGN KEY (source_type)
        REFERENCES sync_sources(source_type)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_source_type
ON sync_jobs(source_type);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status
ON sync_jobs(status);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at
ON sync_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_params
ON sync_jobs USING GIN(params);


CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,

    sync_job_id BIGINT NOT NULL,

    action TEXT NOT NULL
        CHECK (
            action IN (
                'API_CALL',
                'DB_INSERT',
                'DB_UPDATE',
                'DB_ERROR'
            )
        ),

    status TEXT NOT NULL
        CHECK (
            status IN (
                'SUCCESS',
                'ERROR'
            )
        ),

    http_status INT,

    request_url TEXT,

    document_id TEXT,

    message TEXT,
    error_detail TEXT,

    duration_ms INT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_logs_sync_job
        FOREIGN KEY (sync_job_id)
        REFERENCES sync_jobs(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_job_id
ON audit_logs(sync_job_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_status
ON audit_logs(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id
ON audit_logs(document_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs(created_at DESC);


