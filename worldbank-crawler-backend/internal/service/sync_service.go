package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
	"worldbank-crawler/internal/client"
	"worldbank-crawler/internal/helper"
	"worldbank-crawler/internal/mapper"
	"worldbank-crawler/internal/model"
	"worldbank-crawler/internal/repository"
	types "worldbank-crawler/internal/type"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SyncService struct {
	db             *pgxpool.Pool
	client         *client.Client
	documentRepo   *repository.WorldBankDocumentRepository
	auditLogRepo   *repository.AuditLogRepository
	syncLogRepo    *repository.SyncJobRepository
	syncSourceRepo *repository.SyncSourceRepository

	rowsPerPage  int
	requestDelay time.Duration
	maxJobLimit  int
	jobTimeout   time.Duration
	mu           sync.Mutex
	isRunning    bool

	maxRetries int
	retryDelay time.Duration
}

type SyncServiceConfig struct {
	RowsPerPage    int
	RequestDelay   time.Duration
	MaxJobLimit    int
	SyncJobTimeout time.Duration
	maxRetries     int
	retryDelay     time.Duration
}

func NewSyncService(db *pgxpool.Pool, client *client.Client, documentRepo *repository.WorldBankDocumentRepository, auditLogRepo *repository.AuditLogRepository, syncJobRepo *repository.SyncJobRepository, syncSourceRepo *repository.SyncSourceRepository, cfg SyncServiceConfig) *SyncService {
	if cfg.RowsPerPage <= 0 {
		cfg.RowsPerPage = 100
	}

	if cfg.RequestDelay <= 0 {
		cfg.RequestDelay = 500 * time.Millisecond
	}

	if cfg.MaxJobLimit <= 0 {
		cfg.MaxJobLimit = 10000
	}

	if cfg.MaxJobLimit > 10000 {
		cfg.MaxJobLimit = 10000
	}
	if cfg.SyncJobTimeout <= 0 {
		cfg.SyncJobTimeout = 30 * time.Minute
	}
	if cfg.maxRetries <= 0 {
		cfg.maxRetries = 3
	}
	if cfg.retryDelay <= 0 {
		cfg.retryDelay = 2 * time.Second
	}

	return &SyncService{
		db:             db,
		client:         client,
		documentRepo:   documentRepo,
		auditLogRepo:   auditLogRepo,
		syncLogRepo:    syncJobRepo,
		syncSourceRepo: syncSourceRepo,
		rowsPerPage:    cfg.RowsPerPage,
		requestDelay:   cfg.RequestDelay,
		maxJobLimit:    cfg.MaxJobLimit,
		jobTimeout:     cfg.SyncJobTimeout,
		maxRetries:     cfg.maxRetries,
		retryDelay:     cfg.retryDelay,
	}

}
func (s *SyncService) JobTimeout() time.Duration {
	return s.jobTimeout
}

func (s *SyncService) tryStart() bool {
	s.mu.Lock()

	defer s.mu.Unlock()

	if s.isRunning {
		return false
	}
	s.isRunning = true
	return true
}

func (s *SyncService) finish() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.isRunning = false

}

func (s *SyncService) ProcessPage(
	ctx context.Context,
	job model.SyncJob,
	rawdocs []types.WorldBankDocument,
	offsetPage int,
) (
	insertedCount int,
	updatedCount int,
	failedCount int,
	err error,
) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("begin page transaction failed: %w", err)
	}

	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
			return
		}

		if commitErr := tx.Commit(ctx); commitErr != nil {
			err = fmt.Errorf("commit page transaction failed: %w", commitErr)
		}
	}()

	auditRepo := repository.NewAuditLogRepository(tx)
	syncJobRepo := repository.NewSyncJobRepository(tx)

	for _, rawDoc := range rawdocs {
		doc, mapErr := mapper.MapWorldBankDocumentToDocument(rawDoc, job.SourceType)
		if mapErr != nil {
			failedCount++

			if logErr := auditRepo.LogDBError(ctx, job.ID, rawDoc.ID, mapErr); logErr != nil {
				return insertedCount, updatedCount, failedCount,
					fmt.Errorf("log map error failed: doc_id=%s: %w", rawDoc.ID, logErr)
			}

			continue
		}

		inserted, itemErr := s.processOneDocument(ctx, tx, doc)
		if itemErr != nil {
			failedCount++

			if logErr := auditRepo.LogDBError(ctx, job.ID, doc.ID, itemErr); logErr != nil {
				return insertedCount, updatedCount, failedCount,
					fmt.Errorf("log db error failed: doc_id=%s: %w", doc.ID, logErr)
			}

			continue
		}

		if inserted {
			insertedCount++
		} else {
			updatedCount++
		}
	}

	if err := auditRepo.LogDBBatch(
		ctx,
		job.ID,
		insertedCount,
		updatedCount,
		failedCount,
		offsetPage,
	); err != nil {
		return insertedCount, updatedCount, failedCount,
			fmt.Errorf("log db batch failed: %w", err)
	}

	if err := syncJobRepo.AddStats(
		ctx,
		job.ID,
		len(rawdocs),
		insertedCount,
		updatedCount,
		failedCount,
		offsetPage,
	); err != nil {
		return insertedCount, updatedCount, failedCount,
			fmt.Errorf("update sync job stats failed: %w", err)
	}

	return insertedCount, updatedCount, failedCount, nil
}

func (s *SyncService) processOneDocument(
	ctx context.Context,
	parentTx pgx.Tx,
	doc model.Document,
) (inserted bool, err error) {
	itemTx, err := parentTx.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin document savepoint failed: doc_id=%s: %w", doc.ID, err)
	}

	defer func() {
		if err != nil {
			_ = itemTx.Rollback(ctx)
			return
		}

		if commitErr := itemTx.Commit(ctx); commitErr != nil {
			err = fmt.Errorf("commit document savepoint failed: doc_id=%s: %w", doc.ID, commitErr)
		}
	}()

	documentRepo := repository.NewWorldBankDocumentRepository(itemTx)
	dimRepo := repository.NewDIMRepository(itemTx)

	if err := dimRepo.UpsertCountryFromDocument(ctx, doc); err != nil {
		return false, fmt.Errorf("upsert country by document failed: doc_id=%s: %w", doc.ID, err)
	}

	if err := dimRepo.UpsertDocTypeFromDocument(ctx, doc); err != nil {
		return false, fmt.Errorf("upsert doctype by document failed: doc_id=%s: %w", doc.ID, err)
	}

	upsertResult, err := documentRepo.Upsert(ctx, doc)
	if err != nil {
		return false, fmt.Errorf("upsert document failed: doc_id=%s: %w", doc.ID, err)
	}

	return upsertResult.Inserted, nil
}

func (s *SyncService) fetchPageWithRetry(
	ctx context.Context,
	jobID int64,
	opt client.FetchOptions,
) (
	rawDocs []types.WorldBankDocument,
	resp *types.WorldBankAPIResponse,
	requestURL string,
	httpStatus int,
	err error,
) {
	var lastErr error

	for attempt := 1; attempt <= s.maxRetries+1; attempt++ {
		started := time.Now()

		rawDocs, resp, requestURL, httpStatus, err = s.client.FetchDocumentsWithMeta(ctx, opt)

		durationMS := int(time.Since(started).Milliseconds())

		_ = s.auditLogRepo.LogApiCall(
			ctx,
			jobID,
			requestURL,
			httpStatus,
			durationMS,
			err,
		)

		if err == nil {
			return rawDocs, resp, requestURL, httpStatus, nil
		}

		lastErr = err

		if !helper.IsRetryableHTTPStatus(httpStatus) {
			return nil, nil, requestURL, httpStatus, err
		}

		if attempt > s.maxRetries {
			break
		}

		delay := time.Duration(attempt) * s.retryDelay

		log.Printf(
			"retry WorldBank API call: job_id=%d attempt=%d status=%d delay=%s error=%v",
			jobID,
			attempt,
			httpStatus,
			delay,
			err,
		)

		select {
		case <-ctx.Done():
			return nil, nil, requestURL, httpStatus, ctx.Err()

		case <-time.After(delay):
		}
	}

	return nil, nil, requestURL, httpStatus,
		fmt.Errorf("WorldBank API failed after %d retries: %w", s.maxRetries, lastErr)
}

func (s *SyncService) CreateJob(ctx context.Context, input model.CreateSyncJobInput) (int64, error) {
	if input.TargetLimit <= 0 {
		input.TargetLimit = s.maxJobLimit
	}

	if input.TargetLimit > 10000 {
		return 0, types.ErrTargetLimitExceeded
	}

	if input.SourceType == "" {
		return 0, fmt.Errorf("source_type is required")
	}

	return s.syncLogRepo.Create(ctx, input)
}

func (s *SyncService) RunJob(ctx context.Context, jobId int64) error {
	if !s.tryStart() {
		log.Println("sync job skipped because another job is still running")
		return nil
	}
	defer s.finish()

	job, err := s.syncLogRepo.FindByID(ctx, jobId)
	if err != nil {
		return err
	}

	if job.Status == model.SyncJobStatusCompleted {
		return nil
	}

	if job.TargetLimit <= 0 || job.TargetLimit > 10000 {
		return fmt.Errorf("invalid target_limit=%d", job.TargetLimit)
	}

	if err := s.syncLogRepo.MarkRunning(ctx, job.ID); err != nil {
		return err
	}

	params, err := decodeSyncJobParams(job.Params)
	if err != nil {
		_ = s.syncLogRepo.MarkFailed(ctx, job.ID, err.Error())
		return err
	}

	source, err := s.syncSourceRepo.FindBySourceType(ctx, job.SourceType)
	if err != nil {
		_ = s.syncLogRepo.MarkFailed(ctx, job.ID, err.Error())
		return err
	}

	offset := job.CurrentOffset
	fetched := job.Fetched

	for fetched < job.TargetLimit {
		rows := minInt(s.rowsPerPage, job.TargetLimit-fetched)

		if offset+rows > 10000 {
			rows = 10000 - offset
		}

		if rows <= 0 {
			break
		}

		rawDocs, resp, requestURL, httpStatus, fetchErr := s.fetchPageWithRetry(
			ctx,
			job.ID,
			client.FetchOptions{
				Rows:   rows,
				Offset: offset,

				QTerm:   params.QTerm,
				StrDate: params.StrDate,
				EndDate: params.EndDate,

				SourceFilterField: source.FilterField,
				SourceFilterValue: source.FilterValue,

				CountryKey: params.CountryKey,
				Language:   params.Language,

				MajorDocType: params.MajorDocType,
				DocType:      params.DocType,

				Sort:  firstNonEmpty(params.Sort, "last_modified_date"),
				Order: firstNonEmpty(params.Order, "desc"),
			},
		)
		_ = httpStatus
		_ = requestURL

		if fetchErr != nil {
			_ = s.syncLogRepo.MarkFailed(ctx, job.ID, fetchErr.Error())
			return fetchErr
		}

		if resp == nil {
			err := fmt.Errorf("worldbank response is nil")
			_ = s.syncLogRepo.MarkFailed(ctx, job.ID, err.Error())
			return err
		}

		if err := s.syncLogRepo.SetTotalAvailable(ctx, job.ID, resp.Total); err != nil {
			_ = s.syncLogRepo.MarkFailed(ctx, job.ID, err.Error())
			return err
		}

		if len(rawDocs) == 0 {
			break
		}

		offsetAfterPage := offset + rows

		insertedCount, updatedCount, failedCount, processErr := s.ProcessPage(
			ctx,
			*job,
			rawDocs,
			offsetAfterPage,
		)
		if processErr != nil {
			_ = s.syncLogRepo.MarkFailed(ctx, job.ID, processErr.Error())
			return processErr
		}

		fetched += len(rawDocs)
		offset = offsetAfterPage

		log.Printf(
			"sync job page completed: job_id=%d offset=%d rows=%d fetched=%d inserted=%d updated=%d failed=%d api_total=%d",
			job.ID,
			offset,
			rows,
			fetched,
			insertedCount,
			updatedCount,
			failedCount,
			resp.Total,
		)

		if offset >= resp.Total {
			break
		}

		if offset >= 10000 {
			log.Printf("sync job reached API paging limit: job_id=%d offset=%d", job.ID, offset)
			break
		}

		select {
		case <-ctx.Done():
			_ = s.syncLogRepo.MarkFailed(ctx, job.ID, ctx.Err().Error())
			return ctx.Err()

		case <-time.After(s.requestDelay):
		}
	}

	return s.syncLogRepo.MarkCompleted(ctx, job.ID)
}

func decodeSyncJobParams(raw json.RawMessage) (model.SyncJobParams, error) {
	var params model.SyncJobParams

	if len(raw) == 0 {
		return params, nil
	}

	if err := json.Unmarshal(raw, &params); err != nil {
		return params, fmt.Errorf("decode sync job params failed: %w", err)
	}

	return params, nil
}

func minInt(a int, b int) int {
	if a < b {
		return a
	}

	return b
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}

	return ""
}
