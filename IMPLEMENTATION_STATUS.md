# KRISHISETU implementation result — 12 November 2026

**Overall: PARTIALLY COMPLETE — not production-ready.** Existing branding, accounts and reports were preserved. No application was published and no external Python deployment was performed.

## Phase results

| Phase | Status | Actual outcome |
|---|---|---|
| 1 Stabilization | VERIFIED COMPLETE | Existing baseline 52 website + 50 Python tests passed. Architecture and managed schedules inspected; no redesign. |
| 2 Online history | BLOCKED BY EXTERNAL REQUIREMENT | Independently counted 24,656,469 local Parquet rows; checksum matches. Existing bounded history APIs retained. No persistent online Python/data host is connected. |
| 3 Daily pipeline | PARTIALLY COMPLETE | Added database lease, duplicate counts, retryable smaller publication batches, overdue warning and account-alert evaluation hook. Real manual refresh received 16,785 reports and stored 10,000 before a database statement timeout; recorded partial, not success. Subsequently reduced publication batches from 1,000 to 100 with three retries; this change has not been independently exercised by another full ingestion run. |
| 4 Python deployment | BLOCKED BY EXTERNAL REQUIREMENT | Added authenticated stable aliases and POST forecast/model identity resolution. Local API tests pass. No external HTTPS URL/token or hosting access exists. |
| 5 Models | PARTIALLY COMPLETE | Genuinely retrained six historical weekly approaches; saved/reloaded a historical artifact. Not registered in a deployed daily inference registry. Previous published results unchanged. |
| 6 Forecasts | BLOCKED BY EXTERNAL REQUIREMENT | Exact 7/14/30 API validation and missing-model failures tested; 28 rejected. No successful current forecast. Hubli maize's longest consecutive daily sequence is six observations, below existing 240-day eligibility. No missing prices were invented. |
| 7 Nationwide discovery | PARTIALLY COMPLETE | Selected-language location prompts/errors and seven-language freshness labels improved. Still 317 stored Karnataka positions, not national yard coverage. Outside-Karnataka price records exist; exact national yard discovery not verified. |
| 8 Selling decisions | PARTIALLY COMPLETE | Signed-in real maize 20q × ₹3,018 = ₹60,360; expenses ₹1,000 + ₹200 + ₹300 + ₹400 = ₹1,900; net ₹58,460. Save/reopen/edit to 25/reload/delete passed. Forecast/location-dependent full journey incomplete. |
| 9 Isolation/alerts/languages | PARTIALLY COMPLETE | Account-private Cloud CRUD and independent guest/account browser keys; three isolation/IST regression tests. Signed-in CRUD verified. Scheduled in-app alert evaluation implemented but not independently exercised. No SMS/email/push delivery. Two actual accounts on one browser and complete translations remain unverified. |
| 10 Security/recovery | PARTIALLY COMPLETE | Authenticated API, owner-scope and invalid input tests pass; additive owner RLS migrations applied. Real local metadata backup restored into a new separate database with integrity OK. Hosted backup/restore not performed. |
| 11 End-to-end tests | PARTIALLY COMPLETE | 57 website + 56 Python tests pass, zero failed in final full runs. Six main pages load without runtime errors; seven language choices tested at 390px without horizontal overflow. Fully populated translated flows, registration, two-account RLS acceptance, live routing, slow network and production service recovery not verified. |
| 12 Release | NOT IMPLEMENTED | Release deliberately withheld: mandatory current inference, online history, nationwide yards and recovery acceptance do not pass. |

## Data evidence
- Local historical cleaned rows: 24,656,469, reporting dates 2021-01-01 through 2026-04-21.
- Manifest: 24,656,472 received, 3 rejected, 0 duplicate rows; 32 labels, 614 districts, 6,592 reported identities, 370 crops.
- SHA-256: `f14041fa0a154d22e717de38d9cf78c6eb6e27ab13af85edf81da2dbc4d68982`.
- Provenance: data.gov.in variety-wise compilation via Hugging Face DHIVAKARNAIDUSUNKARI/mandi-india-daily-prices-2001-2026. It remains local, not online.
- Latest hosted read during this turn: 96,061 reports, 29 state labels, dates 2025-04-21 through 2026-11-12. Counts may change with ingestion. The original 95,793 was not overwritten or substituted.
- Active daily schedule `25 */3 * * *`; publication schedule `17 * * * *`. Active configuration is not proof of successful scheduled execution of this version.
- Direct data.gov.in API key remains absent; permitted GODL relay returned genuine data. CEDA/Maps remain linked; no new successful usable CEDA/eNAM/ReMS retrieval is claimed.

## Genuine model restoration
Artifact ID: `23f4fd41ac5843a99814cdbf2157a661`; saved under `local-system/runtime/restored-models/` (ignored runtime storage). SHA-256 `0b8840e249333a6efd1724cb7155c6141e7208450ce41f5fb923cb1f4a8aa409`. Reload check passed. 758 genuine daily reports, 218 observed weeks, cutoff 2026-04-16; 36.11 seconds. This is a historical weekly research artifact, not deployed daily inference. Runtime files are sandbox-local and require durable transfer.

| Historical horizon | Validation-selected approach | Test MAE | Test RMSE | Test sMAPE | Test R² |
|---|---|---:|---:|---:|---:|
| 7 days (weekly target) | SARIMA | 97.29 | 134.64 | 4.98% | 0.483 |
| 14 days (weekly target) | ARIMA | 111.98 | 149.14 | 5.72% | 0.337 |
| 28 days (weekly target) | SARIMA | 108.57 | 129.07 | 5.58% | 0.587 |

All six approaches were evaluated. The 7-day SARIMA selected by validation has test MAE ₹97.29 versus Naive ₹94.30; it is not superior on every test metric. This run does not replace the earlier Hubli evaluation. No 30-day weekly result is claimed. No new successful direct-daily artifact was trained because the inspected maize series is ineligible.

## Changes and migrations
- `ARCHITECTURE.md`, `AGENTS.md`, `roadmap.md`: deployment boundaries and remaining work.
- `local-system/fastapi_service.py`, `DEPLOYMENT.md`: `/ready`, `/models`, `/history`, `/model-status`, `/training-status`, `/forecast`, `/forecast/compare` using existing handlers and authentication.
- `local-system/operations.py`: safe restore into a new database; Python security/restore tests expanded.
- `src/lib/private-storage.ts`, `plans.ts`, `alerts.ts`, `farmer-records.functions.ts`, farmer `use-private-records.ts`: account-private records and guest isolation.
- Farmer pages, selling plans and alerts: Cloud CRUD, exact compatible comparison filtering and save error handling.
- Daily sync: service-only expiring lease, duplicate counts, smaller write retries and alert evaluation.
- `source-monitor.ts`, model laboratory: overdue/failed retrieval warning.
- Price timestamps, freshness and nearby prompts: honest dataset-version label and selected-language improvements.
- Added account storage and source-monitor tests; final suite totals 113 passing.
- Managed migrations `0007_private_farmer_records_and_sync_leases` and `0008_scheduled_private_alert_evaluation` applied to Cloud; generated types updated by tool. RLS enabled and ownership policies/grants present. No destructive database migration or account promotion.

## Exact external requirements
1. A persistent HTTPS Python container hosting account/target with deployment access, CPU, at least 2GB RAM, persistent `/data` volume and volume snapshots. No hosting connector was available.
2. Its actual root HTTPS URL saved securely as `KRISHI_PYTHON_URL`.
3. A shared secret stored as `KRISHI_PYTHON_TOKEN` on both Python host and Lovable; enter it using secure forms, never chat or source code. No LLM key is needed for ML forecasting.
4. Transfer and checksum-activate the 206MB historical Parquet and manifest on that volume. Deploy models with durable registry paths; sandbox files are insufficient.
5. Genuine recent, source/market/variety/grade-specific eligible training history. April-only history cannot establish November forecasts. Market aliases require evidence rather than automatic merging.
6. Verified national yard coordinate source/matching and authorized deployed Places/Routes acceptance.
7. An explicitly configured notification provider if SMS/email/push is required; current delivery is in-app only.
8. Safe hosted recovery environment, two-account acceptance, complete populated-language review, monitored scheduled ingestion recovery and all deployed acceptance scenarios before release.

**No production service URL or successful current 7-, 14-, or 30-day forecast exists to report.** No secrets were exposed, no synthetic records were imported and no paid LLM was added.
