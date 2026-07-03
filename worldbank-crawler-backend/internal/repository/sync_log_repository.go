package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"time"

	"worldbank-crawler/internal/model"
	types "worldbank-crawler/internal/type"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SyncJobRepository struct {
	db *pgxpool.Pool
}

func NewSyncJobRepository(db *pgxpool.Pool) *SyncJobRepository {
	return &SyncJobRepository{
		db: db,
	}
}

func (r *SyncJobRepository) Create(
	ctx context.Context,
	input model.CreateSyncJobInput,
) (int64, error) {
	paramsBytes, err := json.Marshal(input.Params)
	if err != nil {
		return 0, fmt.Errorf("marshal sync job params failed: %w", err)
	}

	query := `
		INSERT INTO sync_jobs (
			source_type,
			params,
			status,
			target_limit,
			total_available,
			fetched,
			inserted,
			updated,
			failed_count,
			current_offset
		)
		VALUES (
			$1,
			$2::jsonb,
			$3,
			$4,
			0,
			0,
			0,
			0,
			0,
			0
		)
		RETURNING id
	`

	var id int64

	err = r.db.QueryRow(
		ctx,
		query,
		input.SourceType,
		string(paramsBytes),
		model.SyncJobStatusPending,
		input.TargetLimit,
	).Scan(&id)

	if err != nil {
		return 0, fmt.Errorf("create sync job failed: %w", err)
	}

	return id, nil
}

func (r *SyncJobRepository) FindByID(
	ctx context.Context,
	id int64,
) (*model.SyncJob, error) {
	query := `
		SELECT
			id,
			source_type,
			params,
			status,
			target_limit,
			total_available,
			fetched,
			inserted,
			updated,
			failed_count,
			current_offset,
			started_at,
			finished_at,
			error,
			created_at,
			updated_at
		FROM sync_jobs
		WHERE id = $1
	`

	var job model.SyncJob
	var paramsBytes []byte
	var status string
	var startedAt sql.NullTime
	var finishedAt sql.NullTime
	var errorText sql.NullString

	err := r.db.QueryRow(ctx, query, id).Scan(
		&job.ID,
		&job.SourceType,
		&paramsBytes,
		&status,
		&job.TargetLimit,
		&job.TotalAvailable,
		&job.Fetched,
		&job.Inserted,
		&job.Updated,
		&job.FailedCount,
		&job.CurrentOffset,
		&startedAt,
		&finishedAt,
		&errorText,
		&job.CreatedAt,
		&job.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, types.ErrSyncJobNotFound
		}

		return nil, fmt.Errorf("find sync job id=%d failed: %w", id, err)
	}

	job.Params = json.RawMessage(paramsBytes)
	job.Status = model.SyncJobStatus(status)

	if startedAt.Valid {
		job.StartedAt = &startedAt.Time
	}

	if finishedAt.Valid {
		job.FinishedAt = &finishedAt.Time
	}

	if errorText.Valid {
		job.Error = &errorText.String
	}

	return &job, nil
}

func (r *SyncJobRepository) List(
	ctx context.Context,
	limit int,
	offset int,
) ([]model.SyncJob, error) {
	if limit <= 0 {
		limit = 20
	}

	if limit > 100 {
		limit = 100
	}

	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT
			id,
			source_type,
			params,
			status,
			target_limit,
			total_available,
			fetched,
			inserted,
			updated,
			failed_count,
			current_offset,
			started_at,
			finished_at,
			error,
			created_at,
			updated_at
		FROM sync_jobs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list sync jobs failed: %w", err)
	}
	defer rows.Close()

	jobs := make([]model.SyncJob, 0)

	for rows.Next() {
		var job model.SyncJob
		var paramsBytes []byte
		var status string
		var startedAt sql.NullTime
		var finishedAt sql.NullTime
		var errorText sql.NullString

		if err := rows.Scan(
			&job.ID,
			&job.SourceType,
			&paramsBytes,
			&status,
			&job.TargetLimit,
			&job.TotalAvailable,
			&job.Fetched,
			&job.Inserted,
			&job.Updated,
			&job.FailedCount,
			&job.CurrentOffset,
			&startedAt,
			&finishedAt,
			&errorText,
			&job.CreatedAt,
			&job.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan sync job failed: %w", err)
		}

		job.Params = json.RawMessage(paramsBytes)
		job.Status = model.SyncJobStatus(status)

		if startedAt.Valid {
			job.StartedAt = &startedAt.Time
		}

		if finishedAt.Valid {
			job.FinishedAt = &finishedAt.Time
		}

		if errorText.Valid {
			job.Error = &errorText.String
		}

		jobs = append(jobs, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sync jobs failed: %w", err)
	}

	return jobs, nil
}

func (r *SyncJobRepository) MarkRunning(
	ctx context.Context,
	id int64,
) error {
	query := `
		UPDATE sync_jobs
		SET
			status = $1,
			started_at = COALESCE(started_at, NOW()),
			updated_at = NOW(),
			error = NULL
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, model.SyncJobStatusRunning, id)
	if err != nil {
		return fmt.Errorf("mark sync job running id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) MarkCompleted(
	ctx context.Context,
	id int64,
) error {
	query := `
		UPDATE sync_jobs
		SET
			status = $1,
			finished_at = NOW(),
			updated_at = NOW(),
			error = NULL
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, model.SyncJobStatusCompleted, id)
	if err != nil {
		return fmt.Errorf("mark sync job completed id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) MarkFailed(
	ctx context.Context,
	id int64,
	errorMessage string,
) error {
	query := `
		UPDATE sync_jobs
		SET
			status = $1,
			finished_at = NOW(),
			updated_at = NOW(),
			error = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(ctx, query, model.SyncJobStatusFailed, errorMessage, id)
	if err != nil {
		return fmt.Errorf("mark sync job failed id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) MarkCancelled(
	ctx context.Context,
	id int64,
) error {
	query := `
		UPDATE sync_jobs
		SET
			status = $1,
			finished_at = NOW(),
			updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, model.SyncJobStatusCancelled, id)
	if err != nil {
		return fmt.Errorf("mark sync job cancelled id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) UpdateProgress(
	ctx context.Context,
	id int64,
	currentOffset int,
	fetched int,
) error {
	query := `
		UPDATE sync_jobs
		SET
			current_offset = $1,
			fetched = $2,
			updated_at = NOW()
		WHERE id = $3
	`

	_, err := r.db.Exec(ctx, query, currentOffset, fetched, id)
	if err != nil {
		return fmt.Errorf("update sync job progress id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) SetTotalAvailable(
	ctx context.Context,
	id int64,
	totalAvailable int,
) error {
	query := `
		UPDATE sync_jobs
		SET
			total_available = $1,
			updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, totalAvailable, id)
	if err != nil {
		return fmt.Errorf("set sync job total_available id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) IncrementInserted(
	ctx context.Context,
	id int64,
) error {
	return r.incrementCounter(ctx, id, "inserted")
}

func (r *SyncJobRepository) IncrementUpdated(
	ctx context.Context,
	id int64,
) error {
	return r.incrementCounter(ctx, id, "updated")
}

func (r *SyncJobRepository) IncrementFailed(
	ctx context.Context,
	id int64,
) error {
	return r.incrementCounter(ctx, id, "failed_count")
}

func (r *SyncJobRepository) incrementCounter(
	ctx context.Context,
	id int64,
	column string,
) error {
	switch column {
	case "inserted", "updated", "failed_count":
	default:
		return fmt.Errorf("invalid sync job counter column: %s", column)
	}

	query := fmt.Sprintf(`
		UPDATE sync_jobs
		SET
			%s = %s + 1,
			updated_at = NOW()
		WHERE id = $1
	`, column, column)

	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("increment sync job %s id=%d failed: %w", column, id, err)
	}

	return nil
}

func (r *SyncJobRepository) AddStats(
	ctx context.Context,
	id int64,
	fetchedDelta int,
	insertedDelta int,
	updatedDelta int,
	failedDelta int,
	currentOffset int,
) error {
	query := `
		UPDATE sync_jobs
		SET
			fetched = fetched + $1,
			inserted = inserted + $2,
			updated = updated + $3,
			failed_count = failed_count + $4,
			current_offset = $5,
			updated_at = NOW()
		WHERE id = $6
	`

	_, err := r.db.Exec(
		ctx,
		query,
		fetchedDelta,
		insertedDelta,
		updatedDelta,
		failedDelta,
		currentOffset,
		id,
	)

	if err != nil {
		return fmt.Errorf("add sync job stats id=%d failed: %w", id, err)
	}

	return nil
}

func (r *SyncJobRepository) GetProgress(
	ctx context.Context,
	id int64,
) (*model.SyncJobProgress, error) {
	job, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &model.SyncJobProgress{
		JobID: id,

		Status: job.Status,

		TargetLimit:    job.TargetLimit,
		TotalAvailable: job.TotalAvailable,

		Fetched:     job.Fetched,
		Inserted:    job.Inserted,
		Updated:     job.Updated,
		FailedCount: job.FailedCount,

		CurrentOffset: job.CurrentOffset,

		StartedAt:  job.StartedAt,
		FinishedAt: job.FinishedAt,

		Error: job.Error,
	}, nil
}

func (r *SyncJobRepository) FindStaleRunningJobs(
	ctx context.Context,
	before time.Time,
) ([]model.SyncJob, error) {
	query := `
		SELECT
			id,
			source_type,
			params,
			status,
			target_limit,
			total_available,
			fetched,
			inserted,
			updated,
			failed_count,
			current_offset,
			started_at,
			finished_at,
			error,
			created_at,
			updated_at
		FROM sync_jobs
		WHERE status = $1
		  AND updated_at < $2
		ORDER BY updated_at ASC
	`

	rows, err := r.db.Query(ctx, query, model.SyncJobStatusRunning, before)
	if err != nil {
		return nil, fmt.Errorf("find stale running jobs failed: %w", err)
	}
	defer rows.Close()

	jobs := make([]model.SyncJob, 0)

	for rows.Next() {
		var job model.SyncJob
		var paramsBytes []byte
		var status string
		var startedAt sql.NullTime
		var finishedAt sql.NullTime
		var errorText sql.NullString

		if err := rows.Scan(
			&job.ID,
			&job.SourceType,
			&paramsBytes,
			&status,
			&job.TargetLimit,
			&job.TotalAvailable,
			&job.Fetched,
			&job.Inserted,
			&job.Updated,
			&job.FailedCount,
			&job.CurrentOffset,
			&startedAt,
			&finishedAt,
			&errorText,
			&job.CreatedAt,
			&job.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan stale sync job failed: %w", err)
		}

		job.Params = json.RawMessage(paramsBytes)
		job.Status = model.SyncJobStatus(status)

		if startedAt.Valid {
			job.StartedAt = &startedAt.Time
		}

		if finishedAt.Valid {
			job.FinishedAt = &finishedAt.Time
		}

		if errorText.Valid {
			job.Error = &errorText.String
		}

		jobs = append(jobs, job)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stale sync jobs failed: %w", err)
	}

	return jobs, nil
}
