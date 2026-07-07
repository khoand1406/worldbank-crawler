package repository

import (
	"context"
	"fmt"
	"strings"
	"worldbank-crawler/internal/model"
)

type DIMRepository struct {
	db DBTX
}

func NewDIMRepository(db DBTX) *DIMRepository {
	return &DIMRepository{db: db}
}

func (r *DIMRepository) UpsertCountryFromDocument(ctx context.Context, record model.Document) error {
	countryKey := strings.TrimSpace(record.CountryKey)
	countryName := strings.TrimSpace(record.Country)

	if countryKey == "" {
		return nil
	}

	if countryName == "" {
		countryName = countryKey
	}

	query := `
		INSERT INTO dim_country (
			country_key,
			country_name,
			region,
			updated_at
		)
		VALUES (
			$1,
			$2,
			$3,
			NOW()
		)
		ON CONFLICT (country_key)
		DO UPDATE SET
			country_name = EXCLUDED.country_name,
			region = EXCLUDED.region,
			updated_at = NOW()
	`

	_, err := r.db.Exec(ctx, query, countryKey, countryName, nullIfEmpty(strings.TrimSpace(record.Region)))
	if err != nil {
		return fmt.Errorf("upsert dim_country country_key=%s failed: %w", countryKey, err)
	}
	return nil
}

func (r *DIMRepository) UpsertDocTypeFromDocument(ctx context.Context, doc model.Document) error {
	docTypeKey := strings.TrimSpace(doc.DocTypeKey)
	docTypeName := strings.TrimSpace(doc.DocType)

	if docTypeKey == "" {
		return nil
	}

	if docTypeName == "" {
		docTypeName = docTypeKey
	}

	query := `
		INSERT INTO dim_doc_type (
			doc_type_key,
			doc_type_name,
			major_doc_type,
			updated_at
		)
		VALUES (
			$1,
			$2,
			$3,
			NOW()
		)
		ON CONFLICT (doc_type_key)
		DO UPDATE SET
			doc_type_name = EXCLUDED.doc_type_name,
			major_doc_type = EXCLUDED.major_doc_type,
			updated_at = NOW()
	`

	_, err := r.db.Exec(
		ctx,
		query,
		docTypeKey,
		docTypeName,
		nullIfEmptyString(doc.MajorDocType),
	)

	if err != nil {
		return fmt.Errorf("upsert dim_doc_type doc_type_key=%s failed: %w", docTypeKey, err)
	}

	return nil
}

func nullIfEmptyString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	return value
}
