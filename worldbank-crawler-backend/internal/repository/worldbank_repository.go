package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/lib/pq"

	"worldbank-crawler/internal/model"
)

type WorldBankDocumentRepository struct {
	db *sql.DB
}

func NewWorldBankDocumentRepository(db *sql.DB) *WorldBankDocumentRepository {
	return &WorldBankDocumentRepository{
		db: db,
	}
}

func (r *WorldBankDocumentRepository) Upsert(ctx context.Context, doc model.WorldBankDocument) error {
	if doc.ID == "" {
		return nil
	}

	rawData := doc.RawData
	if len(rawData) == 0 {
		rawBytes, err := json.Marshal(doc)
		if err != nil {
			return fmt.Errorf("marshal document failed: %w", err)
		}
		rawData = rawBytes
	}

	query := `
		INSERT INTO worldbank_documents (
			id,
			api_document_key,

			display_title,
			document_name,
			report_number,

			document_date,
			disclosure_date,
			last_modified_date,
			date_stored,

			document_type,
			major_document_type,

			country,
			region,
			language,

			project_id,
			project_name,

			product_line,
			security_class,
			disclosure_status,
			version_type,

			pdf_url,
			txt_url,
			record_url,

			abstract,
			authors,

			raw_data,
			crawled_at,
			updated_at
		)
		VALUES (
			$1, $2,
			$3, $4, $5,
			$6, $7, $8, $9,
			$10, $11,
			$12, $13, $14,
			$15, $16,
			$17, $18, $19, $20,
			$21, $22, $23,
			$24, $25,
			$26::jsonb,
			NOW(),
			NOW()
		)
		ON CONFLICT (id)
		DO UPDATE SET
			api_document_key = EXCLUDED.api_document_key,

			display_title = EXCLUDED.display_title,
			document_name = EXCLUDED.document_name,
			report_number = EXCLUDED.report_number,

			document_date = EXCLUDED.document_date,
			disclosure_date = EXCLUDED.disclosure_date,
			last_modified_date = EXCLUDED.last_modified_date,
			date_stored = EXCLUDED.date_stored,

			document_type = EXCLUDED.document_type,
			major_document_type = EXCLUDED.major_document_type,

			country = EXCLUDED.country,
			region = EXCLUDED.region,
			language = EXCLUDED.language,

			project_id = EXCLUDED.project_id,
			project_name = EXCLUDED.project_name,

			product_line = EXCLUDED.product_line,
			security_class = EXCLUDED.security_class,
			disclosure_status = EXCLUDED.disclosure_status,
			version_type = EXCLUDED.version_type,

			pdf_url = EXCLUDED.pdf_url,
			txt_url = EXCLUDED.txt_url,
			record_url = EXCLUDED.record_url,

			abstract = EXCLUDED.abstract,
			authors = EXCLUDED.authors,

			raw_data = EXCLUDED.raw_data,
			crawled_at = NOW(),
			updated_at = NOW()
	`

	_, err := r.db.ExecContext(
		ctx,
		query,

		doc.ID,
		doc.APIKey,

		doc.DisplayTitle,
		doc.GetDocumentName(),
		doc.ReportNumber,

		model.ParseTime(doc.DocumentDate),
		model.ParseTime(doc.DisclosureDate),
		model.ParseTime(doc.LastModifiedDate),
		model.ParseTime(doc.DateStored),

		doc.DocumentType,
		doc.MajorDocumentType,

		doc.Country,
		doc.Region,
		doc.Language,

		doc.ProjectID,
		doc.ProjectName,

		doc.ProductLine,
		doc.SecurityClass,
		doc.DisclosureStatus,
		doc.VersionType,

		doc.PDFURL,
		doc.TXTURL,
		doc.URL,

		doc.GetAbstract(),
		pq.Array(doc.GetAuthor()),

		string(rawData),
	)

	if err != nil {
		return fmt.Errorf("upsert document id=%s failed: %w", doc.ID, err)
	}

	return nil
}

func (r *WorldBankDocumentRepository) UpsertMany(
	ctx context.Context,
	docs []model.WorldBankDocument,
) (int, error) {
	totalSaved := 0

	for _, doc := range docs {
		if err := r.Upsert(ctx, doc); err != nil {
			return totalSaved, err
		}

		totalSaved++
	}

	return totalSaved, nil
}
