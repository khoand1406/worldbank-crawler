package repository

import (
	"context"
	"encoding/json"
	"fmt"
	model "worldbank-crawler/internal/model"
	types "worldbank-crawler/internal/type"

	"github.com/jackc/pgx/v5/pgxpool"
)

type WorldBankDocumentRepository struct {
	db *pgxpool.Pool
}

func NewWorldBankDocumentRepository(db *pgxpool.Pool) *WorldBankDocumentRepository {
	return &WorldBankDocumentRepository{db: db}
}

func (r *WorldBankDocumentRepository) Upsert(
	ctx context.Context,
	doc model.Document,
) (types.UpsertResult, error) {
	if doc.ID == "" {
		return types.UpsertResult{}, fmt.Errorf("document id is empty")
	}

	rawJSON := doc.RawJSON
	if len(rawJSON) == 0 {
		rawBytes, err := json.Marshal(doc)
		if err != nil {
			return types.UpsertResult{}, fmt.Errorf("marshal document failed: %w", err)
		}
		rawJSON = rawBytes
	}

	query := `
		INSERT INTO documents (
			id,
			source_type,
			api_document_key,

			display_title,
			doc_name,
			report_number,

			doc_date,
			disclosure_date,
			last_modified_date,
			date_stored,

			doc_type,
			doc_type_key,
			major_doc_type,

			country,
			country_key,
			region,

			project_id,
			project_name,

			language,
			theme,
			lending_instrument,
			product_line,

			security_class,
			disclosure_status,
			version_type,

			no_of_pages,

			pdf_url,
			txt_url,
			record_url,

			abstract,
			authors,

			raw_json,

			first_seen_at,
			last_synced_at,
			updated_at
		)
		VALUES (
			$1, $2, $3,
			$4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13,
			$14, $15, $16,
			$17, $18,
			$19, $20, $21, $22,
			$23, $24, $25,
			$26,
			$27, $28, $29,
			$30, $31,
			$32::jsonb,
			NOW(),
			NOW(),
			NOW()
		)
		ON CONFLICT (id)
		DO UPDATE SET
			source_type = EXCLUDED.source_type,
			api_document_key = EXCLUDED.api_document_key,

			display_title = EXCLUDED.display_title,
			doc_name = EXCLUDED.doc_name,
			report_number = EXCLUDED.report_number,

			doc_date = EXCLUDED.doc_date,
			disclosure_date = EXCLUDED.disclosure_date,
			last_modified_date = EXCLUDED.last_modified_date,
			date_stored = EXCLUDED.date_stored,

			doc_type = EXCLUDED.doc_type,
			doc_type_key = EXCLUDED.doc_type_key,
			major_doc_type = EXCLUDED.major_doc_type,

			country = EXCLUDED.country,
			country_key = EXCLUDED.country_key,
			region = EXCLUDED.region,

			project_id = EXCLUDED.project_id,
			project_name = EXCLUDED.project_name,

			language = EXCLUDED.language,
			theme = EXCLUDED.theme,
			lending_instrument = EXCLUDED.lending_instrument,
			product_line = EXCLUDED.product_line,

			security_class = EXCLUDED.security_class,
			disclosure_status = EXCLUDED.disclosure_status,
			version_type = EXCLUDED.version_type,

			no_of_pages = EXCLUDED.no_of_pages,

			pdf_url = EXCLUDED.pdf_url,
			txt_url = EXCLUDED.txt_url,
			record_url = EXCLUDED.record_url,

			abstract = EXCLUDED.abstract,
			authors = EXCLUDED.authors,

			raw_json = EXCLUDED.raw_json,

			last_synced_at = NOW(),
			updated_at = NOW()
		RETURNING xmax = 0 AS inserted
	`

	var inserted bool

	err := r.db.QueryRow(
		ctx,
		query,

		doc.ID,
		doc.SourceType,
		doc.APIDocumentKey,

		doc.DisplayTitle,
		doc.DocName,
		doc.ReportNumber,

		doc.DocDate,
		doc.DisclosureDate,
		doc.LastModifiedDate,
		doc.DateStored,

		doc.DocType,
		doc.DocTypeKey,
		doc.MajorDocType,

		doc.Country,
		doc.CountryKey,
		doc.Region,

		doc.ProjectID,
		doc.ProjectName,

		doc.Language,
		doc.Theme,
		doc.LendingInstrument,
		doc.ProductLine,

		doc.SecurityClass,
		doc.DisclosureStatus,
		doc.VersionType,

		doc.NoOfPages,

		doc.PDFURL,
		doc.TXTURL,
		doc.RecordURL,

		doc.Abstract,
		doc.Authors,

		string(rawJSON),
	).Scan(&inserted)

	if err != nil {
		return types.UpsertResult{}, fmt.Errorf("upsert document id=%s failed: %w", doc.ID, err)
	}

	return types.UpsertResult{
		DocumentID: doc.ID,
		Inserted:   inserted,
		Updated:    !inserted,
	}, nil
}

func (r *WorldBankDocumentRepository) UpsertMany(
	ctx context.Context,
	docs []model.Document,
) (types.UpsertManyResult, error) {
	result := types.UpsertManyResult{}

	for _, doc := range docs {
		if doc.ID == "" {
			result.Failed++
			continue
		}

		upsertResult, err := r.Upsert(ctx, doc)
		if err != nil {
			result.Failed++
			return result, err
		}

		if upsertResult.Inserted {
			result.Inserted++
		} else {
			result.Updated++
		}

		result.Total++
	}

	return result, nil
}
