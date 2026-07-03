package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CrawlLogRepository struct {
	db *pgxpool.Pool
}

func NewCrawlLogRepository(db *pgxpool.Pool) *CrawlLogRepository {
	return &CrawlLogRepository{
		db: db,
	}
}

func (r *CrawlLogRepository) Create(
	ctx context.Context,
	source string,
) (int64, error) {
	var id int64

	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO crawl_logs (
			source,
			status,
			started_at
		)
		VALUES (
			$1,
			$2,
			NOW()
		)
		RETURNING id
		`,
		source,
		"running",
	).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("create crawl log failed: %w", err)
	}

	return id, nil
}

func (r *CrawlLogRepository) Finish(
	ctx context.Context,
	id int64,
	status string,
	totalSaved int,
	errorMessage string,
) error {
	_, err := r.db.Exec(
		ctx,
		`
		UPDATE crawl_logs
		SET
			status = $1,
			finished_at = NOW(),
			total_saved = $2,
			error_message = NULLIF($3, '')
		WHERE id = $4
		`,
		status,
		totalSaved,
		errorMessage,
		id,
	)

	if err != nil {
		return fmt.Errorf("finish crawl log failed id=%d: %w", id, err)
	}

	return nil
}
