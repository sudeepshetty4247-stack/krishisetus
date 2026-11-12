# KRISHISETU local Python system

## Honest delivery status

This is the independent Python service and local application, not a claim that nationwide data has been retrieved or models have been trained on official records. The Lovable preview connects over authenticated HTTPS; Python does not run inside the hosted frontend. The local application uses Flask/Jinja, HTML, CSS and vanilla JavaScript.

Implemented: SQLite relationships and indexed source-specific observations; original file preservation; CSV/XLSX imports; audited normalization and deduplication; dynamic observed nationwide catalogues; paginated APIs; basic coverage; bounded resumable data.gov.in current-report ingestion; partitioned Parquet exports; configurable daily ingestion process; chronological baseline/ARIMA/Random Forest/XGBoost comparison code; versioned artifacts; endpoint forecasts; empirical uncertainty; selected-tree SHAP endpoint; same-day/variety/source net ranking and break-even transport; basic volatility, seasonality, common-day competitiveness and arrival correlation; local frontend; automated tests.

**Not completed:** CEDA connector/current contract, verified nationwide historical download, official-data model training/evaluation, automatic retraining, geographic maps, price alerts, historical strategy backtesting, interactive full research charting, comprehensive seven-language translation review, and integration with the hosted Lovable preview. Source/API limits and complete coverage cannot be asserted without authenticated requests. The local interface preserves the design language but is not a pixel-identical replacement of every preview element.

## Windows setup

1. Install Python **3.11 or newer** from python.org with the Python launcher enabled. Python 3.12/3.13 is a practical choice for package availability.
2. Extract this folder to a writable location. Double-click `run.bat`.
3. The launcher creates `.venv`, installs dependencies, initializes SQLite and starts Flask. Open **http://127.0.0.1:5000**. The first dependency installation requires internet.
4. Stop with Ctrl+C. Data lives in `runtime/` and survives restarts; copy that folder to back it up.
5. Optional: copy `.env.example` to `.env`, configure your own data.gov.in key, and restart. Never share `.env` or expose keys in frontend files.

Manual setup:
```text
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python manage.py init
.venv\Scripts\python app.py
```

## Actual source access audit

See `source-access-audit.json` for actual sandbox checks and UTC timestamps.

- CEDA's documented base is `/v1/agmarknet/`. The hosted linked connector successfully returns commodity catalogues; the Dharwad maize market request returned an upstream timeout on 12 November 2026. Earlier unversioned 404 findings are superseded, not evidence that CEDA is unsupported.
- Public AGMARKNET 2.0 uses `https://api.agmarknet.gov.in/v1/daily-price-arrival/filters` and POST `report`. The exact filters endpoint returned HTTP 403 in this environment. The monthly paginated connector preserves raw responses, rejects unknown units and checkpoints successful pages. Its live report schema and earliest historical coverage remain unverified; it does not bypass access controls.
- data.gov.in resource `9ef84268-d588-465a-a308-a864a43d0070` request failed with a connection error from this environment. Neither key was configured. The implemented documented resource connector uses `api-key`, `format`, `offset`, `limit` and explicit filters. **Its authenticated live behavior remains unverified**.
- Daily data.gov.in reports are not a complete historical archive. Offsets can shift while the source changes; resume belongs to a bounded snapshot, not guaranteed historical completeness. Use explicit new snapshots and deduplication. Large nationwide historical ingestion needs a verified CEDA contract or official historical exports.
- e-NAM and ReMS are **not integrated**: no verified supported machine-readable interface was established. AGMARKNET observations are supported through authorized official data.gov.in retrieval or provenance-labelled exports, not unauthorized scraping.
- CEDA publishes non-commercial-use and attribution requirements: https://ceda.ashoka.edu.in/api-terms-conditions/. Review permission, citation and logo requirements before importing/redistributing CEDA data. No CEDA data is bundled here.

## Import genuine data

Use the Data Quality page to upload CSV/XLSX (20 MB maximum) with the original source name and URL. **A user-supplied URL is provenance, not independent certification.** Do not import synthetic rows for research.

Required columns: `state,district,market,commodity,variety,arrival_date,modal_price,price_unit`. Optional: `min_price,max_price,arrivals,arrival_unit`.

- Dates: YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY.
- Explicit price units: INR/quintal, INR/kg, INR/tonne (recorded conversions). Never assume unspecified units on imports.
- Arrival quantities require a separate arrival unit; absence is retained as missing, not zero.
- Missing min/max is retained as NULL. Invalid dates/prices and inconsistent ranges are rejected with original rows retained in cleaning audit.
- Outliers are flagged against earlier source-specific observations; not silently deleted.
- Same-day rows from different sources remain separate. Names are whitespace-normalized, not fuzzy-merged into possibly wrong geographies.

```text
.venv\Scripts\python manage.py import C:\data\official.csv --source-name "Official downloaded report" --source-url "https://original-source.example/report"
.venv\Scripts\python manage.py audit
.venv\Scripts\python manage.py export-parquet
```
Use your actual original URL, not the example. Exports are append-only snapshots; deduplicate by observation `id` across repeated exports. DuckDB can read partitioned Parquet offline. SQLite remains the application query layer; a Parquet-backed national-scale query engine is not yet wired into all APIs.

## Controlled official refresh

```text
.venv\Scripts\python manage.py source-check
.venv\Scripts\python manage.py ingest --max-pages 5 --filters "{\"state\":\"Karnataka\"}"
.venv\Scripts\python manage.py ingest --max-pages 5 --filters "{\"state\":\"Karnataka\"}"
.venv\Scripts\python manage.py ingest --reset --max-pages 5
.venv\Scripts\python manage.py schedule --max-pages 5
```
The second identical job resumes its saved offset. `--reset` starts a new current-report snapshot. Configurable pause is at least one second; retries honor HTTP Retry-After for 429/5xx. No uncontrolled fan-out occurs. A source is successful only after a response is saved and validated. The scheduler is a foreground local process; nothing runs after it stops. Use Windows Task Scheduler to launch it at login if desired. Retraining is deliberately an explicit command, not silently triggered by every update.

## Real model training

Get source-specific identifiers from the local catalogue and prices endpoints. Select exactly one state, district, market, commodity, variety and source. A conservative first implementation requires **at least 240 consecutive calendar-day reports at the end of the series**. This can exclude many real mandis; unsupported is preferable to misleading calendar-day forecasts. No missing-price interpolation, future-fill or zero-fill occurs. More flexible sparse-calendar modelling remains pending.

```text
.venv\Scripts\python manage.py train --group "{\"state\":\"Karnataka\",\"district\":\"Dharwad\",\"market\":\"Dharwad\",\"commodity\":\"Maize\",\"variety\":\"Local\",\"source\":\"data_gov\"}" --horizons 7,14,30
.venv\Scripts\python manage.py report --output research-report.json
```

The example identifiers must match your actual data. There are **no trained models or invented performance numbers bundled**. Features are lag 1/3/7/14/30/90, past rolling mean/median/SD and calendar features. Market/commodity/variety identity is fixed per series. Arrivals are analysed separately and are not used as future inputs.

Validation uses first 65% train, next 17% validation and last 18% untouched final test. Training target dates are purged at split boundaries. Direct horizon models predict the H-day endpoint; no invented intermediate daily path is shown. At least 30 origins are required per split; overlapping H-day targets are dependent, not statistically independent samples. RF/XGBoost are fixed during validation and refit only with pre-test targets for final testing. ARIMA rolling refits use earlier reports only. Model selection is validation MAE, then RMSE, frozen before final test. All candidate test results and baseline comparisons are reported honestly. Deployment artifacts refit after evaluation.

Intervals use the 95th percentile absolute validation error: **empirical and not guaranteed coverage** under dependent/nonstationary prices. R² is supplemental; sMAPE/MAPE denominators are guarded. Actual/predicted residual records, periods, parameters, dataset hash, failures and selection rationale are saved. Joblib artifacts are internal only; never load uploaded pickle files.

## Local API

Read endpoints: `/api/status`, `/api/catalog/states`, `/api/catalog/districts`, `/api/catalog/markets`, `/api/catalog/commodities`, `/api/catalog/varieties`, `/api/prices`, `/api/arrivals`, `/api/trends`, `/api/quality`, `/api/ingestion-history`, `/api/models`, `/api/forecast`, `/api/explain`, `/api/analytics`.

Filters: state, district, market, commodity, variety, source, start, end. Read pages: limit 1–1000, offset ≥0. Large analyses require narrower filters. Forecast/explain require model_id and a validated horizon. Mutations: `/api/import`, `/api/refresh`, `/api/selling-comparison`, protected by session CSRF token and loopback Host checks. Never expose the development server to the internet. Authentication, TLS and a production reverse proxy would be required for an external deployment.

Net = modal price × quintals − transport − loading/unloading − other costs. Break-even **additional** transport = additional gross value − additional nontransport costs. A negative result means no positive extra transport allowance. Expense defaults of zero are explicit assumptions, not real quotes. No geographic distances are fabricated. Comparisons require one date/source/commodity/variety and a current-market report.

## Tests and reproducibility

```text
.venv\Scripts\python -m pytest -q tests
```
Test numeric rows are clearly marked fixtures and never seeded into the operational database or used as official model results. Tests cover calculations, coverage, units, duplicate audit, source separation, import, SQL binding, CSRF, bounded pagination, feature leakage and unsupported models. No Windows host was available here: Python local execution was tested on Linux; Windows launcher execution remains unverified.

Built-in translations inherit the preview dictionaries; some regional-language details still fall back to English. Fonts use local system fonts offline. Keep professional translation completion and full farmer usability review on the roadmap.

## Production service deployment and recovery

Build the included Dockerfile from this directory. Attach a persistent volume at `/data`, supply `KRISHI_PYTHON_TOKEN` securely, and expose port 8000 through HTTPS. Configure that same token and the HTTPS origin as `KRISHI_PYTHON_TOKEN` and `KRISHI_PYTHON_URL` in hosted project secrets. Do not expose local page endpoints: their loopback Host enforcement is intentional. `/service/health` is public and contains no credentials; all other service operations require the shared bearer token.

Run a single service process as configured; threaded jobs persist atomic status files but are not a distributed job queue. An interrupted running job must be resubmitted after inspecting logs. Multi-replica job orchestration remains unimplemented. Hosted publication is hourly at minute 17 (delivery can be spread roughly 30 seconds), fetches at most 1,000 audited official observations per call and commits rows plus cursor transactionally. It cannot succeed before the Python deployment and official ingestion are available. No source rows are bundled.

```text
python manage.py ingest-history --start 2001-01-01 --end 2026-11-12 --max-pages 10
python manage.py schedule --max-pages 10
python manage.py backup --directory /data/backups
```

The historical date range is a requested search range, not a coverage assertion. Repeat identical ingest commands to resume. Numeric filters follow the source catalogue. Do not mix AGMARKNET numeric-ID filters with data.gov.in text filters. For recovery, stop service and scheduler, restore a verified SQLite backup as `metadata.sqlite`, restore matching raw/model/Parquet directories, then resume. Copy the entire persistent volume to encrypted off-host storage; the backup command verifies SQLite integrity but is not an off-site backup solution.

Seasonal naive and weekly SARIMA join the original four candidates. Hosted forecast responses withhold stale history, excessive final-test sMAPE, baseline winners, or models failing to beat the naive final-test MAE. Thresholds are configurable, not scientific guarantees. Saved residual diagnostics are not live forecast-error monitoring. Scheduler retraining is bounded to ten registered groups per run and requires the configured number of new observations; execution on real data and external supervision remain unverified.