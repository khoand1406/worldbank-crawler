package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	types "worldbank-crawler/internal/type"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type FetchOptions struct {
	Rows   int
	Offset int

	QTerm   string
	Sort    string
	Order   string
	StrDate string
	EndDate string

	SourceFilterField string
	SourceFilterValue string

	MajorDocType string
	DocType      string

	CountryKey string
	Language   string
	Fields     []string
}

func NewClient(baseURL string) *Client {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://search.worldbank.org/api/v3/wds"
	}

	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func NewClientWithHTTP(baseURL string, httpClient *http.Client) *Client {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://search.worldbank.org/api/v3/wds"
	}

	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: 30 * time.Second,
		}
	}

	return &Client{
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}
func DefaultFields() []string {
	return []string{
		"id",
		"last_modified_date",
		"admreg",
		"authors",
		"count",
		"docna",
		"docty",
		"owner",
		"projn",
		"subsc",
		"theme",
		"prdln",
		"seccl",
		"lang",
		"lndinstr",
		"lndinstr_exact",
		"majtheme",
		"sectr",
		"repnb",
		"docdt",
		"datestored",
		"volnb",
		"majdocty",
		"abstracts",
		"display_title",
		"disclosure_date",
		"pdfurl",
		"txturl",
		"disclstat",
		"chronical_docm_id",
		"versiontyp",
		"projectid",
		"guid",
		"prdln_exact",
		"available_in",
		"fullavailablein",
		"url",
	}
}

func (c *Client) buildUrl(opt FetchOptions) (string, error) {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return "", fmt.Errorf("invalid world bank base url: %w", err)
	}
	q := u.Query()
	q.Set("format", "json")
	q.Set("rows", strconv.Itoa(opt.Rows))
	q.Set("os", strconv.Itoa(opt.Offset))
	q.Set("sort", opt.Sort)
	q.Set("order", opt.Order)
	q.Set("fl", strings.Join(opt.Fields, ","))
	if strings.TrimSpace(opt.QTerm) != "" {
		q.Set("qterm", strings.TrimSpace(opt.QTerm))
	}
	if strings.TrimSpace(opt.StrDate) != "" {
		q.Set("strdate", strings.TrimSpace(opt.StrDate))
	}

	if strings.TrimSpace(opt.EndDate) != "" {
		q.Set("enddate", strings.TrimSpace(opt.EndDate))
	}
	if opt.SourceFilterField != "" && opt.SourceFilterValue != "" {
		q.Set(opt.SourceFilterField, opt.SourceFilterValue)
	}

	if opt.CountryKey != "" {
		q.Set("count_exact", opt.CountryKey)
	}

	if opt.Language != "" {
		q.Set("lang_exact", opt.Language)
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func (c *Client) FetchDocuments(ctx context.Context, opt FetchOptions) ([]types.WorldBankDocument, *types.WorldBankAPIResponse, error) {
	if opt.Rows <= 0 {
		opt.Rows = 100
	}
	if opt.Sort == "" {
		opt.Sort = "last_modified_date"
	}

	if opt.Order == "" {
		opt.Order = "desc"
	}

	if len(opt.Fields) == 0 {
		opt.Fields = DefaultFields()
	}
	reqUrl, err := c.buildUrl(opt)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to build request URL: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqUrl, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create request: %w", err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, nil, fmt.Errorf("received non-2xx response: %d", resp.StatusCode)
	}
	var body bytes.Buffer
	if _, err := body.ReadFrom(resp.Body); err != nil {
		return nil, nil, fmt.Errorf("read response from body failed: %w", err)
	}
	var apiRespone types.WorldBankAPIResponse
	if err := json.Unmarshal(body.Bytes(), &apiRespone); err != nil {
		return nil, nil, fmt.Errorf("decode response failed: %w", err)
	}
	var rawResp struct {
		Documents map[string]json.RawMessage `json:"documents"`
	}
	if err := json.Unmarshal(body.Bytes(), &rawResp); err != nil {
		return nil, nil, fmt.Errorf("decode raw documents failed: %w", err)
	}

	items := make([]types.WorldBankDocument, 0, len(apiRespone.Documents))
	for apiKey, doc := range apiRespone.Documents {
		if strings.TrimSpace(doc.ID) == "" {
			log.Printf("skip invalid document: api_key=%s empty id", apiKey)
			continue
		}
		doc.APIKey = apiKey
		if raw, ok := rawResp.Documents[apiKey]; ok {
			doc.RawData = raw
		}
		items = append(items, doc)
	}
	log.Printf(
		"WorldBank API fetched: page=%d offset=%d rows=%d total=%d docs=%d",
		apiRespone.Page,
		apiRespone.Offset,
		apiRespone.Rows,
		apiRespone.Total,
		len(items),
	)
	return items, &apiRespone, nil
}

func (c *Client) FetchDocumentsWithMeta(ctx context.Context, opt FetchOptions) ([]types.WorldBankDocument, *types.WorldBankAPIResponse, string, int, error) {
	reqUrl, err := c.buildUrl(opt)
	if err != nil {
		return nil, nil, "", 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqUrl, nil)
	if err != nil {
		return nil, nil, "", 0, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, "", 0, err
	}
	defer resp.Body.Close()
	httpStatus := resp.StatusCode
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, nil, reqUrl, httpStatus, fmt.Errorf("received non-2xx response: %d", resp.StatusCode)
	}
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, reqUrl, httpStatus, err
	}
	var apiResp types.WorldBankAPIResponse
	if err := json.Unmarshal(bodyBytes, &apiResp); err != nil {
		return nil, nil, "", 0, err
	}
	var rawResp struct {
		Documents map[string]json.RawMessage `json:"documents"`
	}

	if err := json.Unmarshal(bodyBytes, &rawResp); err != nil {
		return nil, nil, reqUrl, httpStatus, err
	}
	docs := make([]types.WorldBankDocument, 0, len(apiResp.Documents))
	for apiKey, doc := range apiResp.Documents {
		if doc.ID == "" {
			log.Printf("skip invalid document: api_key=%s empty id", apiKey)
			continue
		}

		doc.APIKey = apiKey

		if rawJSON, ok := rawResp.Documents[apiKey]; ok {
			doc.RawData = rawJSON
		}

		docs = append(docs, doc)
	}
	return docs, &apiResp, reqUrl, httpStatus, nil
}
