package types

type UpsertResult struct {
	DocumentID string
	Inserted   bool
	Updated    bool
}

type UpsertManyResult struct {
	Total    int
	Inserted int
	Updated  int
	Failed   int
}
