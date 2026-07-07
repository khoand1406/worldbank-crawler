package helper

func IsRetryableHTTPStatus(status int) bool {
	return status == 0 ||
		status == 408 ||
		status == 429 ||
		status == 500 ||
		status == 502 ||
		status == 503 ||
		status == 504
}
