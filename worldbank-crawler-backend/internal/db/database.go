package db

import (
	"database/sql"
	"fmt"
	"time"

	"worldbank-crawler/internal/config"

	_ "github.com/lib/pq"
)

func ConnectDB(cfg config.AppConfig) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBName,
	)

	database, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database failed: %w", err)
	}

	database.SetMaxOpenConns(10)
	database.SetMaxIdleConns(5)
	database.SetConnMaxLifetime(30 * time.Minute)

	if err := database.Ping(); err != nil {
		database.Close()
		return nil, fmt.Errorf("ping database failed: %w", err)
	}

	return database, nil
}
