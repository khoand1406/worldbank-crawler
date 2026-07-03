package model

import (
	"encoding/json"
	"time"
)

type Document struct {
	ID string

	SourceType string

	APIDocumentKey string

	DisplayTitle string
	DocName      string
	ReportNumber string

	DocDate          *time.Time
	DisclosureDate   *time.Time
	LastModifiedDate *time.Time
	DateStored       *time.Time

	DocType      string
	DocTypeKey   string
	MajorDocType string

	Country    string
	CountryKey string
	Region     string

	ProjectID   string
	ProjectName string

	Language string
	Theme    string

	LendingInstrument string
	ProductLine       string
	SecurityClass     string
	VersionType       string
	DisclosureStatus  string
	NoOfPages         *int

	PDFURL    string
	TXTURL    string
	RecordURL string

	Abstract string
	Authors  []string

	RawJSON json.RawMessage
}
