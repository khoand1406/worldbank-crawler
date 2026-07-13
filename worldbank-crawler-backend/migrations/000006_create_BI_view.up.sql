CREATE OR REPLACE VIEW vw_documents_tableau AS
SELECT
    d.id,
    d.source_type,

    d.display_title,
    d.doc_name,
    d.report_number,

    d.doc_date,
    EXTRACT(YEAR FROM d.doc_date)::INT AS doc_year,
    EXTRACT(MONTH FROM d.doc_date)::INT AS doc_month,

    d.disclosure_date,
    d.last_modified_date,
    d.date_stored,

    CASE
        WHEN d.doc_date IS NOT NULL AND d.disclosure_date IS NOT NULL
        THEN EXTRACT(DAY FROM d.disclosure_date - d.doc_date)::INT
        ELSE NULL
    END AS disclosure_delay_days,

    d.doc_type,
    d.doc_type_key,
    d.major_doc_type,

    d.country,
    d.country_key,
    d.region,

    d.project_id,
    d.project_name,

    d.language,
    d.theme,
    d.lending_instrument,
    d.product_line,

    d.security_class,
    d.disclosure_status,
    d.version_type,

    d.no_of_pages,

    d.pdf_url,
    d.txt_url,
    d.record_url,

    d.first_seen_at,
    d.last_synced_at,
    d.updated_at
FROM documents d;


CREATE OR REPLACE VIEW vw_sync_health_tableau AS
SELECT
    sj.id AS sync_job_id,
    sj.source_type,
    sj.status,
    sj.target_limit,
    sj.total_available,
    sj.fetched,
    sj.inserted,
    sj.updated,
    sj.failed_count,
    sj.current_offset,
    sj.started_at,
    sj.finished_at,

    CASE
        WHEN sj.started_at IS NOT NULL AND sj.finished_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (sj.finished_at - sj.started_at))::INT
        ELSE NULL
    END AS duration_seconds,

    COUNT(al.id) FILTER (WHERE al.action = 'API_CALL') AS api_call_count,
    COUNT(al.id) FILTER (WHERE al.status = 'ERROR') AS error_log_count

FROM sync_jobs sj
LEFT JOIN audit_logs al
    ON al.sync_job_id = sj.id
GROUP BY sj.id;


CREATE OR REPLACE VIEW vw_documents_by_country AS
SELECT
    country_key,
    country,
    region,
    source_type,
    COUNT(*) AS total_documents
FROM documents
WHERE country IS NOT NULL AND country <> ''
GROUP BY country_key, country, region, source_type;


CREATE OR REPLACE VIEW vw_documents_by_year AS
SELECT
    EXTRACT(YEAR FROM doc_date)::INT AS doc_year,
    source_type,
    major_doc_type,
    COUNT(*) AS total_documents
FROM documents
WHERE doc_date IS NOT NULL
GROUP BY
    EXTRACT(YEAR FROM doc_date)::INT,
    source_type,
    major_doc_type;


CREATE OR REPLACE VIEW vw_documents_by_doc_type AS
SELECT
    source_type,
    major_doc_type,
    doc_type,
    COUNT(*) AS total_documents
FROM documents
WHERE doc_type IS NOT NULL AND doc_type <> ''
GROUP BY source_type, major_doc_type, doc_type;


CREATE OR REPLACE VIEW vw_documents_by_theme AS
SELECT
    dt.theme_name,
    d.source_type,
    COUNT(*) AS total_documents
FROM document_themes dth
JOIN dim_theme dt
    ON dt.id = dth.theme_id
JOIN documents d
    ON d.id = dth.document_id
GROUP BY dt.theme_name, d.source_type;