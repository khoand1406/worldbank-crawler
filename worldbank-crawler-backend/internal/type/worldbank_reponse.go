package types

import (
	"encoding/json"
	"strings"
	"time"
)

type WorldBankAPIResponse struct {
	Rows      int                          `json:"rows"`
	Offset    int                          `json:"os"`
	Page      int                          `json:"page"`
	Total     int                          `json:"total"`
	Documents map[string]WorldBankDocument `json:"documents"`
}

type WorldBankDocument struct {
	APIKey string `json:"-"`

	ID               string `json:"id"`
	LastModifiedDate string `json:"last_modified_date"`
	Region           string `json:"admreg"`
	Country          string `json:"count"`

	Authors  map[string]AuthorItem  `json:"authors"`
	DocNames map[string]DocNameItem `json:"docna"`

	DocumentType string `json:"docty"`
	Owner        string `json:"owner"`
	ProjectName  string `json:"projn"`

	SubSector string `json:"subsc"`
	Theme     string `json:"theme"`

	ProductLine   string `json:"prdln"`
	SecurityClass string `json:"seccl"`
	Language      string `json:"lang"`

	LendingInstruments     map[string]LendingInstrumentItem `json:"lndinstr"`
	LendingInstrumentExact string                           `json:"lndinstr_exact"`

	MajorTheme string                `json:"majtheme"`
	Sectors    map[string]SectorItem `json:"sectr"`

	ReportNumber string `json:"repnb"`
	DocumentDate string `json:"docdt"`
	DateStored   string `json:"datestored"`

	VolumeNumber      string `json:"volnb"`
	MajorDocumentType string `json:"majdocty"`

	Abstracts AbstractData `json:"abstracts"`

	DisplayTitle   string `json:"display_title"`
	DisclosureDate string `json:"disclosure_date"`

	PDFURL string `json:"pdfurl"`
	TXTURL string `json:"txturl"`

	DisclosureStatus string `json:"disclstat"`
	ChronicalDocID   string `json:"chronical_docm_id"`
	VersionType      string `json:"versiontyp"`

	ProjectID string `json:"projectid"`
	GUID      string `json:"guid"`

	ProductLineExact string `json:"prdln_exact"`
	AvailableIn      string `json:"available_in"`

	FullAvailableIn []string `json:"fullavailablein"`

	URL string `json:"url"`

	RawData json.RawMessage `json:"-"`
}
type AuthorItem struct {
	Author string `json:"author"`
}

type DocNameItem struct {
	DocName string `json:"docna"`
}

type LendingInstrumentItem struct {
	LendingInstrument string `json:"lndinstr"`
}

type SectorItem struct {
	Sector string `json:"sector"`
}

type AbstractData struct {
	CData string `json:"cdata!"`
}

func (d WorldBankDocument) GetDocumentName() string {
	for _, item := range d.DocNames {
		name := item.DocName
		if name != "" {
			return name
		}
	}
	return ""
}

func (d WorldBankDocument) GetAuthor() []string {
	authors := make([]string, 0)
	for _, item := range d.Authors {
		author := strings.TrimSpace(item.Author)
		if author != "" {
			authors = append(authors, author)
		}
	}
	return authors
}
func (d WorldBankDocument) GetAbstract() string {
	return strings.TrimSpace(d.Abstracts.CData)
}

func (d WorldBankDocument) GetLendingInstruments() []string {
	values := make([]string, 0)

	for _, item := range d.LendingInstruments {
		value := strings.TrimSpace(item.LendingInstrument)
		if value != "" {
			values = append(values, value)
		}
	}

	return values
}

func (d WorldBankDocument) GetSectors() []string {
	values := make([]string, 0)

	for _, item := range d.Sectors {
		value := strings.TrimSpace(item.Sector)
		if value != "" {
			values = append(values, value)
		}
	}

	return values
}
func ParseTime(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z",
		"2006-01-02",
	}

	for _, layout := range layouts {
		t, err := time.Parse(layout, value)
		if err == nil {
			return &t
		}
	}

	return nil
}
