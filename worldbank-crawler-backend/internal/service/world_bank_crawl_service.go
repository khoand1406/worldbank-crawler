package service

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
	"worldbank-crawler/internal/client"
	"worldbank-crawler/internal/repository"
	types "worldbank-crawler/internal/type"
)

type WorldBankCrawlService struct {
	client       *client.Client
	documentRepo *repository.WorldBankDocumentRepository
	crawlogRepo  *repository.CrawlLogRepository
	rowsPerPage  int
	maxPages     int
	qTerm        string
	strDate      string
	endDate      string
	requestDelay time.Duration

	mu        sync.Mutex
	isRunning bool
}

type WorldbankCrawlServiceConfig struct {
	RowsPerPage  int
	MaxPages     int
	QTerm        string
	StrDate      string
	EndDate      string
	RequestDelay time.Duration
}

func NewWorldBankCrawlService(
	client *client.Client,
	documentRepo *repository.WorldBankDocumentRepository,
	crawlogRepo *repository.CrawlLogRepository,
	config WorldbankCrawlServiceConfig,
) *WorldBankCrawlService {
	if config.RowsPerPage <= 0 {
		config.RowsPerPage = 100
	}

	if config.RequestDelay <= 0 {
		config.RequestDelay = 500 * time.Millisecond
	}
	return &WorldBankCrawlService{
		client:       client,
		documentRepo: documentRepo,
		crawlogRepo:  crawlogRepo,
		rowsPerPage:  config.RowsPerPage,
		maxPages:     config.MaxPages,
		qTerm:        config.QTerm,
		strDate:      config.StrDate,
		endDate:      config.EndDate,
		requestDelay: config.RequestDelay,
	}
}

func (s *WorldBankCrawlService) tryStart() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.isRunning {
		return false
	}
	s.isRunning = true
	return true
}

func (s *WorldBankCrawlService) finish() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.isRunning = false
}

func (s *WorldBankCrawlService) Crawl(ctx context.Context) error {
	if !s.tryStart() {
		log.Println("WorldBank crawl skipped because previous crawl is still running")
		return nil
	}
	defer s.finish()

	logID, err := s.crawlogRepo.Create(ctx, "worldbank_documents")
	if err != nil {
		return err
	}

	totalSaved := 0
	totalFetched := 0

	defer func() {
		status := "success"
		errorMessage := ""

		if err != nil {
			status = "failed"
			errorMessage = err.Error()
		}

		finishErr := s.crawlogRepo.Finish(
			context.Background(),
			logID,
			status,
			totalSaved,
			errorMessage,
		)
		if finishErr != nil {
			log.Printf("finish crawl log failed: %v", finishErr)
		}
	}()

	log.Println("WorldBank crawl started")

	offset := 0

	for page := 1; ; page++ {
		if s.maxPages > 0 && page > s.maxPages {
			log.Printf("Reached max pages: %d", s.maxPages)
			break
		}

		docs, resp, fetchErr := s.fetchPage(ctx, offset)
		if fetchErr != nil {
			err = fetchErr
			return err
		}

		if resp == nil {
			log.Println("WorldBank API response is nil")
			break
		}

		if len(docs) == 0 {
			log.Println("No more documents")
			break
		}

		fetched := len(docs)
		totalFetched += fetched

		saved, saveErr := s.documentRepo.UpsertMany(ctx, docs)
		if saveErr != nil {
			err = saveErr
			return err
		}

		totalSaved += saved

		log.Printf(
			"WorldBank crawl page completed: page=%d offset=%d fetched=%d saved=%d total_fetched=%d total_saved=%d api_total=%d",
			page,
			offset,
			fetched,
			saved,
			totalFetched,
			totalSaved,
			resp.Total,
		)

		offset += s.rowsPerPage

		if resp.Total > 0 && offset >= resp.Total {
			log.Println("Reached API total")
			break
		}

		select {
		case <-ctx.Done():
			err = ctx.Err()
			return err
		case <-time.After(s.requestDelay):
		}
	}

	log.Printf(
		"WorldBank crawl finished. total_fetched=%d total_saved=%d",
		totalFetched,
		totalSaved,
	)

	return nil
}

func (s *WorldBankCrawlService) fetchPage(ctx context.Context, offset int) ([]types.WorldBankDocument,
	*types.WorldBankAPIResponse, error) {
	docs, resp, err := s.client.FetchDocuments(ctx, client.FetchOptions{
		Rows:    s.rowsPerPage,
		Offset:  offset,
		QTerm:   s.qTerm,
		StrDate: s.strDate,
		EndDate: s.endDate,
		Sort:    "last_modified_date",
		Order:   "desc",
	})
	if err != nil {
		return nil, nil, err
	}
	return docs, resp, nil
}

func (s *WorldBankCrawlService) crawlRange(ctx context.Context, strDate string, endDate string) (int, error) {
	totalSaved := 0
	totalFetched := 0
	offset := 0
	for page := 1; ; page++ {
		if s.maxPages > 0 && page > s.maxPages {
			log.Printf("Reached max pages: %d", s.maxPages)
			break
		}
		docs, resp, fetchErr := s.fetchPage(ctx, offset)
		if fetchErr != nil {
			return totalSaved, fetchErr
		}
		if resp == nil {
			log.Println("WorldBank API response is nil")
			break
		}

		if len(docs) == 0 {
			log.Println("No more documents")
			break
		}

		fetched := len(docs)
		totalFetched += fetched

		saved, saveErr := s.documentRepo.UpsertMany(ctx, docs)
		if saveErr != nil {
			return totalSaved, saveErr
		}

		totalSaved += saved

		log.Printf(
			"WorldBank crawl page completed: strdate=%s enddate=%s page=%d offset=%d fetched=%d saved=%d total_fetched=%d total_saved=%d api_total=%d",
			strDate,
			endDate,
			page,
			offset,
			fetched,
			saved,
			totalFetched,
			totalSaved,
			resp.Total,
		)

		offset += s.rowsPerPage

		if resp.Total > 0 && offset >= resp.Total {
			log.Println("Reached API total")
			break
		}

		if offset >= 100000 {
			log.Printf("Reached API offset limit for range %s - %s. Need smaller date range.", strDate, endDate)
			break
		}

		select {
		case <-ctx.Done():
			return totalSaved, ctx.Err()
		case <-time.After(s.requestDelay):
		}
	}

	return totalSaved, nil
}

func (s *WorldBankCrawlService) fetchPageWithDate(
	ctx context.Context,
	offset int,
	strDate string,
	endDate string,
) ([]types.WorldBankDocument, *types.WorldBankAPIResponse, error) {
	docs, resp, err := s.client.FetchDocuments(ctx, client.FetchOptions{
		Rows:    s.rowsPerPage,
		Offset:  offset,
		QTerm:   s.qTerm,
		StrDate: strDate,
		EndDate: endDate,
		Sort:    "last_modified_date",
		Order:   "desc",
	})
	if err != nil {
		return nil, nil, err
	}

	return docs, resp, nil
}

func (s *WorldBankCrawlService) CrawlAllByYear(
	ctx context.Context,
	startYear int,
	endYear int,
) error {
	if !s.tryStart() {
		log.Println("WorldBank crawl skipped because previous crawl is still running")
		return nil
	}
	defer s.finish()

	logID, err := s.crawlogRepo.Create(ctx, "worldbank_documents_full_by_year")
	if err != nil {
		return err
	}

	totalSaved := 0

	defer func() {
		status := "success"
		errorMessage := ""

		if err != nil {
			status = "failed"
			errorMessage = err.Error()
		}

		finishErr := s.crawlogRepo.Finish(
			context.Background(),
			logID,
			status,
			totalSaved,
			errorMessage,
		)
		if finishErr != nil {
			log.Printf("finish crawl log failed: %v", finishErr)
		}
	}()

	log.Printf("WorldBank full crawl by year started: startYear=%d endYear=%d", startYear, endYear)

	for year := endYear; year >= startYear; year-- {
		strDate := fmt.Sprintf("%d-01-01", year)
		endDate := fmt.Sprintf("%d-12-31", year)

		log.Printf("Crawling year=%d strdate=%s enddate=%s", year, strDate, endDate)

		saved, crawlErr := s.crawlRange(ctx, strDate, endDate)
		if crawlErr != nil {
			err = fmt.Errorf("crawl year=%d failed: %w", year, crawlErr)
			return err
		}

		totalSaved += saved

		log.Printf("Finished year=%d saved=%d total_saved=%d", year, saved, totalSaved)
	}

	log.Printf("WorldBank full crawl by year finished. total_saved=%d", totalSaved)

	return nil
}
