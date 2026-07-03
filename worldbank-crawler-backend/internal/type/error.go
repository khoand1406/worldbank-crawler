package types

import "errors"

var (
	ErrMissingDocumentID    = errors.New("missing document id")
	ErrTargetLimitExceeded  = errors.New("target_limit must be less than or equal to 10000")
	ErrSyncJobNotFound      = errors.New("sync job not found")
	ErrSyncSourceNotFound   = errors.New("sync source not found")
	ErrUnsupportedSource    = errors.New("unsupported sync source")
	ErrInvalidSyncJobStatus = errors.New("invalid sync job status")
)
