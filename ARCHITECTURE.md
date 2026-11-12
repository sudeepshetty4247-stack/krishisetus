# Existing KRISHISETU deployment architecture

```text
Farmer / Research React pages
  → same-origin authenticated TanStack application functions
    → Cloud: official reports, import audit, private plans/alerts, source runs
    → HTTPS Python FastAPI: authenticated daily model registry / history / forecasts
      → persistent volume: immutable Parquet, SQLite metadata, model artifacts
      → permitted official sources / licensed historical compilation
```

The hosted application cannot run Python. A linked persistent container host is required; none was available during this implementation. A sandbox process or file is not a production deployment.

## Boundaries
- Browser sessions identify the account. Server functions overwrite the owner with the verified session identity; database policies independently enforce ownership.
- Account records never read the legacy guest keys. Guest plans remain editable locally, with no automatic account migration.
- Python trusts the shared server credential, not browser-provided identity. Its endpoints are private server-to-server APIs, with owner-isolated model stores.
- Daily calendar endpoint models are separate from weekly research models. Four weeks remains 28 days, never 30.
- Source datasets and reporting dates retain original provenance; retrieval timestamps never replace reporting dates.
- Additive schema changes use managed migrations. No reports or existing accounts were deleted.

## Applied schema changes
- Migration 0007: private `farmer_records`, service-only ingestion leases, duplicate/correction counts in source runs.
- Migration 0008: service-only account-alert evaluation after official ingestion; in-app delivery only.
- No destructive migrations, so no pre-destruction backup was required. SQLite restore tests use new test paths only.