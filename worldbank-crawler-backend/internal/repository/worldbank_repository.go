package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	model "worldbank-crawler/internal/model"
	types "worldbank-crawler/internal/type"
)

type WorldBankDocumentRepository struct {
	db DBTX
}

func NewWorldBankDocumentRepository(db DBTX) *WorldBankDocumentRepository {
	return &WorldBankDocumentRepository{db: db}
}

func (r *WorldBankDocumentRepository) ListDocuments(
	ctx context.Context,
	filter types.DocumentListQuery,
) (types.PagedResult[types.DocumentListItem], error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}

	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	whereSQL, args := buildDocumentQuery(filter)

	countQuery := `
		SELECT COUNT(*)
		FROM documents
	` + whereSQL

	var total int

	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return types.PagedResult[types.DocumentListItem]{}, fmt.Errorf("count documents failed: %w", err)
	}

	offset := (filter.Page - 1) * filter.PageSize

	args = append(args, filter.PageSize, offset)

	sortBy := normalizeSortBy(filter.SortBy)
	sortOrder := normalizeDocumentSortOrder(filter.SortOrder)

	query := fmt.Sprintf(
		`SELECT
			id,
			source_type,
			display_title,
			doc_date,
			doc_type,
			major_doc_type,
			country,
			country_key,
			region,
			language,
			pdf_url,
			record_url
		FROM documents
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`,
		whereSQL,
		sortBy,
		sortOrder,
		len(args)-1,
		len(args),
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return types.PagedResult[types.DocumentListItem]{}, fmt.Errorf("list documents failed: %w", err)
	}
	defer rows.Close()

	items := make([]types.DocumentListItem, 0)

	for rows.Next() {
		var item types.DocumentListItem
		var docDate sql.NullTime

		err := rows.Scan(
			&item.ID,
			&item.SourceType,
			&item.DisplayTitle,
			&docDate,
			&item.DocType,
			&item.MajorDocType,
			&item.Country,
			&item.CountryKey,
			&item.Region,
			&item.Language,
			&item.PDFURL,
			&item.RecordURL,
		)
		if err != nil {
			return types.PagedResult[types.DocumentListItem]{}, fmt.Errorf("scan document list item failed: %w", err)
		}

		if docDate.Valid {
			item.DocDate = &docDate.Time
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return types.PagedResult[types.DocumentListItem]{}, fmt.Errorf("iterate documents failed: %w", err)
	}

	return types.PagedResult[types.DocumentListItem]{
		Items:    items,
		Page:     filter.Page,
		PageSize: filter.PageSize,
		Total:    total,
	}, nil
}

func normalizeSortBy(sortBy string) any {
	switch sortBy {
	case "doc_date":
		return "doc_date"
	case "disclosure_date":
		return "disclosure_date"
	case "last_modified_date":
		return "last_modified_date"
	case "country":
		return "country"
	case "doc_type":
		return "doc_type"
	case "created_at":
		return "first_seen_at"
	default:
		return "doc_date"
	}
}

func normalizeDocumentSortOrder(sortOrder string) string {
	switch strings.ToLower(sortOrder) {
	case "asc":
		return "ASC"
	default:
		return "DESC"
	}
}

func buildDocumentQuery(filter types.DocumentListQuery) (string, []any) {
	conditions := make([]string, 0)
	args := make([]any, 0)
	addCondition := func(condition string, value any) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(condition, len(args)))
	}
	if filter.SourceType != "" {
		addCondition("source_type = $%d", filter.SourceType)
	}

	if filter.CountryKey != "" {
		addCondition("country_key = $%d", filter.CountryKey)
	}

	if filter.Region != "" {
		addCondition("region ILIKE $%d", "%"+filter.Region+"%")
	}

	if filter.Language != "" {
		addCondition("language ILIKE $%d", "%"+filter.Language+"%")
	}

	if filter.DocType != "" {
		addCondition("doc_type ILIKE $%d", "%"+filter.DocType+"%")
	}

	if filter.MajorDocType != "" {
		addCondition("major_doc_type ILIKE $%d", "%"+filter.MajorDocType+"%")
	}

	if filter.TitleKeyword != "" {
		addCondition("display_title ILIKE $%d", "%"+filter.TitleKeyword+"%")
	}

	if filter.DocDateFrom != nil {
		addCondition("doc_date >= $%d", *filter.DocDateFrom)
	}

	if filter.DocDateTo != nil {
		addCondition("doc_date <= $%d", *filter.DocDateTo)
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
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
		nullIfEmpty(doc.DocTypeKey),
		doc.MajorDocType,

		doc.Country,
		nullIfEmpty(doc.CountryKey),
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

func (r *WorldBankDocumentRepository) FindDocumentByID(
	ctx context.Context,
	id string,
) (*types.DocumentDetail, error) {
	query := `
		SELECT
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
			raw_json
		FROM documents
		WHERE id = $1
	`

	var doc model.Document

	err := r.db.QueryRow(ctx, query, id).Scan(
		&doc.ID,
		&doc.SourceType,
		&doc.APIDocumentKey,
		&doc.DisplayTitle,
		&doc.DocName,
		&doc.ReportNumber,
		&doc.DocDate,
		&doc.DisclosureDate,
		&doc.LastModifiedDate,
		&doc.DateStored,
		&doc.DocType,
		&doc.DocTypeKey,
		&doc.MajorDocType,
		&doc.Country,
		&doc.CountryKey,
		&doc.Region,
		&doc.ProjectID,
		&doc.ProjectName,
		&doc.Language,
		&doc.Theme,
		&doc.LendingInstrument,
		&doc.ProductLine,
		&doc.SecurityClass,
		&doc.DisclosureStatus,
		&doc.VersionType,
		&doc.NoOfPages,
		&doc.PDFURL,
		&doc.TXTURL,
		&doc.RecordURL,
		&doc.Abstract,
		&doc.Authors,
		&doc.RawJSON,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}

		return nil, fmt.Errorf("find document id=%s failed: %w", id, err)
	}

	themes, err := r.findThemesByDocumentID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &types.DocumentDetail{
		Document: doc,
		Themes:   themes,
	}, nil
}

func (r *WorldBankDocumentRepository) findThemesByDocumentID(
	ctx context.Context,
	documentID string,
) ([]string, error) {
	query := `
		SELECT dt.theme_name
		FROM document_themes dth
		JOIN dim_theme dt ON dt.id = dth.theme_id
		WHERE dth.document_id = $1
		ORDER BY dt.theme_name ASC
	`

	rows, err := r.db.Query(ctx, query, documentID)
	if err != nil {
		return nil, fmt.Errorf("find document themes failed: %w", err)
	}
	defer rows.Close()

	themes := make([]string, 0)

	for rows.Next() {
		var theme string

		if err := rows.Scan(&theme); err != nil {
			return nil, fmt.Errorf("scan document theme failed: %w", err)
		}

		themes = append(themes, theme)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate document themes failed: %w", err)
	}

	return themes, nil
}
