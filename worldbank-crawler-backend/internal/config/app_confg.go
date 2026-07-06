package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type AppConfig struct {
	AppEnv     string
	ServerAddr string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	WorldBankBaseURL string

	RowsPerPage  int
	RequestDelay time.Duration
	MaxJobLimit  int

	SyncJobTimeout time.Duration
}

func LoadConfig() (AppConfig, error) {
	_ = godotenv.Load()

	cfg := AppConfig{
		AppEnv:     getEnv("APP_ENV", "development"),
		ServerAddr: getEnv("SERVER_ADDR", ":8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "worldbank_crawler"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		WorldBankBaseURL: getEnv("WORLDBANK_BASE_URL", "https://search.worldbank.org/api/v3/wds"),

		RowsPerPage: getEnvAsInt("ROWS_PER_PAGE", 100),
		MaxJobLimit: getEnvAsInt("MAX_JOB_LIMIT", 10000),

		RequestDelay:   time.Duration(getEnvAsInt("REQUEST_DELAY_MS", 500)) * time.Millisecond,
		SyncJobTimeout: time.Duration(getEnvAsInt("SYNC_JOB_TIMEOUT_MINUTES", 30)) * time.Minute,
	}

	if cfg.DBPassword == "" {
		return AppConfig{}, fmt.Errorf("DB_PASSWORD is required")
	}

	if cfg.RowsPerPage <= 0 {
		cfg.RowsPerPage = 100
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

	return cfg, nil
}

func (c AppConfig) PostgresDSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
		c.DBSSLMode,
	)
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func getEnvAsInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}
