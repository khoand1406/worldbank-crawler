package mapper

import (
	"encoding/json"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"worldbank-crawler/internal/model"
	types "worldbank-crawler/internal/type"
)

var ErrMissingDocumentID = errors.New("missing document id")

func MapWorldBankDocumentToDocument(
	raw types.WorldBankDocument,
	sourceType string,
) (model.Document, error) {
	id := strings.TrimSpace(raw.ID)
	if id == "" {
		return model.Document{}, ErrMissingDocumentID
	}

	rawJSON := raw.RawData
	if len(rawJSON) == 0 {
		rawBytes, err := json.Marshal(raw)
		if err != nil {
			return model.Document{}, err
		}
		rawJSON = rawBytes
	}

	return model.Document{
		ID: id,

		SourceType: strings.TrimSpace(sourceType),

		APIDocumentKey: strings.TrimSpace(raw.APIKey),

		DisplayTitle: strings.TrimSpace(raw.DisplayTitle),
		DocName:      strings.TrimSpace(raw.GetDocumentName()),
		ReportNumber: strings.TrimSpace(raw.ReportNumber),

		DocDate:          types.ParseTime(raw.DocumentDate),
		DisclosureDate:   types.ParseTime(raw.DisclosureDate),
		LastModifiedDate: types.ParseTime(raw.LastModifiedDate),
		DateStored:       types.ParseTime(raw.DateStored),

		DocType:      strings.TrimSpace(raw.DocumentType),
		DocTypeKey:   mapperKey(raw.DocumentType),
		MajorDocType: strings.TrimSpace(raw.MajorDocumentType),

		Country:    strings.TrimSpace(raw.Country),
		CountryKey: mapperKey(raw.Country),
		Region:     strings.TrimSpace(raw.Region),

		ProjectID:   strings.TrimSpace(raw.ProjectID),
		ProjectName: strings.TrimSpace(raw.ProjectName),

		Language: strings.TrimSpace(raw.Language),

		Theme:             strings.TrimSpace(raw.Theme),
		LendingInstrument: strings.TrimSpace(raw.LendingInstrumentExact),
		ProductLine:       firstNonEmpty(raw.ProductLineExact, raw.ProductLine),

		SecurityClass:    strings.TrimSpace(raw.SecurityClass),
		DisclosureStatus: strings.TrimSpace(raw.DisclosureStatus),
		VersionType:      strings.TrimSpace(raw.VersionType),

		NoOfPages: nil,

		PDFURL:    strings.TrimSpace(raw.PDFURL),
		TXTURL:    strings.TrimSpace(raw.TXTURL),
		RecordURL: strings.TrimSpace(raw.URL),

		Abstract: strings.TrimSpace(raw.GetAbstract()),
		Authors:  raw.GetAuthor(),

		RawJSON: rawJSON,
	}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}

	return ""
}

func parseOptionalInt(value string) *int {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return nil
	}

	return &parsed
}

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

func mapperKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}

	value = nonAlphaNum.ReplaceAllString(value, "_")
	value = strings.Trim(value, "_")

	return value
}
