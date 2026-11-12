# Critical production fixes

Preserve the working website, accounts and hosted tables.

## Issues found
- Python service is not hosted; existing service uses Flask and its health response incorrectly implies readiness without models.
- The previously prepared nationwide Parquet and model binaries are no longer present in this development environment. Saved evaluation metadata is not a deployed model.
- Selling rankings currently include different dates/grades/units; nearby cards present approximate coordinates as precise distances.
- Daily ingestion deletes reports older than 21 days, retries linearly and does not report all persistence errors.
- Managed ingestion schedules exist; full production acceptance remains incomplete.

## Implementation
1. Add a FastAPI service alongside the independent local Flask interface, preserving the authenticated `/service/*` contract. Add readiness, validated history pagination, model comparison/metadata, forecast/explanation and retraining-status endpoints with explicit unavailable results.
2. Add a persistent-volume Parquet/DuckDB history repository with manifest verification, filtered pagination and aggregation. Provide reproducible transfer/import tooling; never claim absent files were imported.
3. Exclude incompatible observations from net rankings and historical opportunities; validate quantity and expenses. Keep existing selling formulas and add concrete regression tests.
4. Distinguish approximate locations from verified yards; suppress precise/zero distance and routing for uncertain positions. Keep nationwide manual search and honest coverage limitations.
5. Preserve daily collected history, use exponential retries and surface persistence failures. Inspect existing schedules without replacing working jobs.
6. Run existing and new tests, then verify selling-plan interactions and service-unavailable behaviour in the browser. Produce the requested A–N evidence report.

## External requirements
Actual Python deployment needs a persistent HTTPS container host and shared service credential. Nationwide online history requires durable storage and re-acquisition/transfer of the actual files. Recent validated observations are required before publishing November 7/14/30-day predictions. These remain blocked until available; no temporary tunnel or historical extrapolation will substitute.

## Technical approach
FastAPI mounts the legacy Flask service for backwards-compatible analytics/jobs while versioned endpoints use the existing registered model functions with freshness/baseline gates. DuckDB reads immutable, manifest-verified Parquet on a persistent volume; no million-row browser queries. Hosted server functions retain verified account authorization and server-only credentials.