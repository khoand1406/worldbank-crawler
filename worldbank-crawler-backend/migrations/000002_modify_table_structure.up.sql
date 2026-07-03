Drop table IF EXISTS worldbank_documents;
DROP INDEX IF EXISTS idx_wb_documents_doc_date;
DROP INDEX IF EXISTS idx_wb_documents_disclosure_date;
DROP INDEX IF EXISTS idx_wb_documents_country;
DROP INDEX IF EXISTS idx_wb_documents_project_id;

Drop table if exists crawl_logs;