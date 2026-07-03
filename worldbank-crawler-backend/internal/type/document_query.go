package types

import (
	"time"
	"worldbank-crawler/internal/model"
)

type DocumentListQuery struct {
	Page     int
	PageSize int

	SourceType string

	CountryKey string
	Region     string

	MajorDocType string
	DocType      string

	Language string

	TitleKeyword string

	DocDateFrom *time.Time
	DocDateTo   *time.Time

	SortBy    string
	SortOrder string
}

type DocumentListItem struct {
	ID string `json:"id"`

	SourceType string `json:"source_type"`

	DisplayTitle string `json:"display_title"`

	DocDate *time.Time `json:"doc_date"`

	DocType      string `json:"doc_type"`
	MajorDocType string `json:"major_doc_type"`

	Country string `json:"country"`
	Region  string `json:"region"`

	Language string `json:"language"`

	PDFURL    string `json:"pdf_url"`
	RecordURL string `json:"record_url"`
}

type DocumentDetail struct {
	model.Document

	Themes []string `json:"themes"`
}

type PagedResult[T any] struct {
	Items []T `json:"items"`

	Page     int `json:"page"`
	PageSize int `json:"page_size"`

	Total int `json:"total"`
}
