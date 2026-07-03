CREATE TABLE IF NOT EXISTS worldbank_documents (
    id TEXT PRIMARY KEY,

    api_document_key TEXT,

    display_title TEXT,
    document_name TEXT,
    report_number TEXT,

    document_date TIMESTAMPTZ,
    disclosure_date TIMESTAMPTZ,
    last_modified_date TIMESTAMPTZ,
    date_stored TIMESTAMPTZ,

    document_type TEXT,
    major_document_type TEXT,

    country TEXT,
    region TEXT,
    language TEXT,

    project_id TEXT,
    project_name TEXT,

    product_line TEXT,
    security_class TEXT,
    disclosure_status TEXT,
    version_type TEXT,

    pdf_url TEXT,
    txt_url TEXT,
    record_url TEXT,

    abstract TEXT,
    authors TEXT[],

    raw_data JSONB NOT NULL,

    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wb_documents_doc_date
ON worldbank_documents(document_date);

CREATE INDEX IF NOT EXISTS idx_wb_documents_disclosure_date
ON worldbank_documents(disclosure_date);

CREATE INDEX IF NOT EXISTS idx_wb_documents_country
ON worldbank_documents(country);

CREATE INDEX IF NOT EXISTS idx_wb_documents_project_id
ON worldbank_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_wb_documents_raw_data
ON worldbank_documents USING GIN(raw_data);

CREATE INDEX IF NOT EXISTS idx_wb_documents_last_modified_date
ON worldbank_documents(last_modified_date);

CREATE INDEX IF NOT EXISTS idx_wb_documents_document_type
ON worldbank_documents(document_type);

CREATE TABLE IF NOT EXISTS crawl_logs (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    total_saved INT DEFAULT 0,
    error_message TEXT
);