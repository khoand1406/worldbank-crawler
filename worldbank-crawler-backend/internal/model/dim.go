package model

import "time"

type DIMCountry struct {
	CountryKey  string
	CountryName string
	Region      string
	CreatedAt   *time.Time
	UpdatedAt   *time.Time
}

type DIMDocumentType struct {
	DocTypeKey   string
	DocTypeName  string
	MajorDocType string
	CreatedAt    *time.Time
	UpdatedAt    *time.Time
}

type DIMTheme struct {
	ThemeKey  string
	ThemeName string
	CreatedAt *time.Time
	UpdatedAt *time.Time
}
