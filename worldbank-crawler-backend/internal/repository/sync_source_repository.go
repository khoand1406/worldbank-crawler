package repository

import (
	"context"
	"database/sql"
	"fmt"
	"worldbank-crawler/internal/model"
	types "worldbank-crawler/internal/type"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SyncSourceRepository struct {
	db *pgxpool.Pool
}

func NewSyncSourceRepository(db *pgxpool.Pool) *SyncSourceRepository {
	return &SyncSourceRepository{db: db}
}

func (r *SyncSourceRepository) FindBySourceType(
	ctx context.Context,
	sourceType string,
) (*model.SyncSource, error) {
	query := `
		SELECT
			id,
			source_type,
			name,
			filter_field,
			filter_value,
			enabled,
			created_at,
			updated_at
		FROM sync_sources
		WHERE source_type = $1
	`

	var source model.SyncSource

	err := r.db.QueryRow(ctx, query, sourceType).Scan(
		&source.ID,
		&source.SourceType,
		&source.Name,
		&source.FilterField,
		&source.FilterValue,
		&source.Enabled,
		&source.CreatedAt,
		&source.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, types.ErrSyncSourceNotFound
		}

		return nil, fmt.Errorf("find sync source source_type=%s failed: %w", sourceType, err)
	}

	if !source.Enabled {
		return nil, fmt.Errorf("sync source %s is disabled", sourceType)
	}

	return &source, nil
}
