package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type AppConfig struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	WorldBankURL string
	CronSchedule string

	RowsPerPage int
	MaxPages    int

	QTerm   string
	StrDate string
	EndDate string

	RequestDelay time.Duration
	CrawlTimeout time.Duration
	RunOnStartup bool

	CrawlMode string
	StartYear int
	EndYear   int
}

func LoadConfig() (AppConfig, error) {
	dbHost, err := requireEnv("DB_HOST")
	if err != nil {
		return AppConfig{}, err
	}

	dbPort, err := requireEnv("DB_PORT")
	if err != nil {
		return AppConfig{}, err
	}

	dbUser, err := requireEnv("DB_USER")
	if err != nil {
		return AppConfig{}, err
	}

	dbPassword, err := requireEnv("DB_PASSWORD")
	if err != nil {
		return AppConfig{}, err
	}

	dbName, err := requireEnv("DB_NAME")
	if err != nil {
		return AppConfig{}, err
	}

	worldBankURL, err := requireEnv("WORLD_BANK_URL")
	if err != nil {
		return AppConfig{}, err
	}

	cronSchedule, err := requireEnv("CRON_SCHEDULE")
	if err != nil {
		return AppConfig{}, err
	}

	rowsPerPage, err := requireEnvInt("ROWS_PER_PAGE")
	if err != nil {
		return AppConfig{}, err
	}

	maxPages, err := requireEnvInt("MAX_PAGES")
	if err != nil {
		return AppConfig{}, err
	}

	requestDelayMS, err := requireEnvInt("REQUEST_DELAY_MS")
	if err != nil {
		return AppConfig{}, err
	}

	crawlTimeoutMinutes, err := requireEnvInt("CRAWL_TIMEOUT_MINUTES")
	if err != nil {
		return AppConfig{}, err
	}

	runOnStartup, err := requireEnvBool("RUN_ON_STARTUP")
	if err != nil {
		return AppConfig{}, err
	}

	return AppConfig{
		DBHost:     dbHost,
		DBPort:     dbPort,
		DBUser:     dbUser,
		DBPassword: dbPassword,
		DBName:     dbName,

		WorldBankURL: worldBankURL,
		CronSchedule: cronSchedule,

		RowsPerPage: rowsPerPage,
		MaxPages:    maxPages,

		QTerm:   os.Getenv("QTERM"),
		StrDate: os.Getenv("STR_DATE"),
		EndDate: os.Getenv("END_DATE"),

		RequestDelay: time.Duration(requestDelayMS) * time.Millisecond,
		CrawlTimeout: time.Duration(crawlTimeoutMinutes) * time.Minute,
		RunOnStartup: runOnStartup,
		CrawlMode:    os.Getenv("CRAWL_MODE"),
		StartYear: func() int {
			year, err := requireEnvInt("START_YEAR")
			if err != nil {
				return 0
			}
			return year
		}(),
		EndYear: func() int {
			year, err := requireEnvInt("END_YEAR")
			if err != nil {
				return 0
			}
			return year
		}(),
	}, nil
}

func (c AppConfig) DatabaseURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
	)
}

func requireEnv(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return "", fmt.Errorf("missing required environment variable: %s", key)
	}

	return value, nil
}

func requireEnvInt(key string) (int, error) {
	value, err := requireEnv(key)
	if err != nil {
		return 0, err
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("environment variable %s must be an integer, got %q", key, value)
	}

	return parsed, nil
}

func requireEnvBool(key string) (bool, error) {
	value, err := requireEnv(key)
	if err != nil {
		return false, err
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("environment variable %s must be boolean, got %q", key, value)
	}

	return parsed, nil
}
