# Python service deployment

This is the existing KRISHISETU Python engine, not another farmer application. The Windows/local Flask interface remains unchanged. The container now serves FastAPI and the compatible authenticated Flask operations.

## Required external configuration
- Persistent HTTPS container host with at least 2 GB RAM, CPU-only inference/training and a persistent `/data` disk. Use one worker; training uses the existing process/thread job mechanism, not a distributed queue.
- Host-managed TLS/reverse proxy, request timeout and automated volume snapshots. Do not expose a development tunnel as production.
- Set `KRISHISETU_DATA_DIR=/data` and a shared `KRISHI_PYTHON_TOKEN` securely on both the Python host and the Lovable secret form. The value must match; never commit it or prefix it with `VITE_`.
- On Lovable set `KRISHI_PYTHON_URL` to the HTTPS root URL. Browser calls stay through the authenticated website proxy; do not send the shared token to the browser.

Run container using the existing `Dockerfile`. Local diagnostic command: `uvicorn fastapi_service:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log` from `local-system`.

## History transfer and activation
Download 2021–2026 files using `data_engine.history_import.download`, then execute `python -m data_engine.nationwide_prepare`. Preparation writes the cleaned Parquet and its SHA-256 manifest, received/rejected/duplicate counts and original dates. Transfer the resulting Parquet and manifest onto `/data/analytical/` on the persistent host, then run:

```text
python -m data_engine.analytical_store --root /data --file /data/analytical/india_2021_2026.parquet --manifest /data/analytical/india_2021_2026.manifest.json
```

Activation refuses invalid rows, duplicate business keys, wrong checksum and count mismatches. Existing active history is unchanged on failure. Pagination accepts limit 1–1000, and offsets up to 100,000; filter dates/geography for larger result sets. SQL values are parameterized. Analytical data is separate from daily hosted reports; no old data is relabelled current.

## Service contracts
- Stable authenticated aliases `GET /ready`, `/models`, `/history`, `/model-status`, `/training-status` share the existing versioned handlers.
- `POST /forecast` accepts trusted owner, either a model ID or exact filters (state/district/market/commodity/variety/source/grade), and horizon 7, 14 or 30. `POST /forecast/compare` accepts up to five independent requests; failures remain explicit. The website uses `/forecast`, never the weekly lab schema.
- Public `GET /health` and `/service/health`: **liveness only**, not readiness.
- Authenticated `GET /v1/ready?owner=...`: history availability plus owner-specific artifact presence; not proof of valid current forecast.
- Authenticated `/v1/history`: crop/variety/grade/state/district/market/start/end, pagination and optional historical aggregation.
- Authenticated `/v1/models`, `/v1/models/{id}`: owner-isolated registry and evaluation metadata.
- Authenticated `/v1/forecast/7`, `/14`, `/30`: model_id and owner; unavailable when missing, stale, unvalidated, or worse than baseline.
- Authenticated `/v1/explanation/{id}`: selected-tree SHAP only, never invented causal explanations.
- Authenticated `/v1/retraining/{job_id}` and existing POST `/service/train`, `/service/job`: existing asynchronous training/status contract.
- Existing POST `/service/analytics`, `/compare`, `/backtest`, `/forecast`, `/models`, `/explain` remain compatible.

Every private operation requires the shared bearer token from the trusted website proxy. The proxy overwrites owner with the verified account identity. Use `X-Owner-ID` for per-owner limits (60 requests/minute); without it limits share a service bucket. API credentials grant trusted-service access; these endpoints are not browser-facing user authentication.

## Forecast constraints
Daily registered models use actual 7/14/30-calendar-day targets. Current daily-series sufficiency requires 240 consecutive reports and 30 origins per split; sparse mandi series may be unavailable. Weekly lab runs use 7/14/28 days and are **not** 30-day models. Old weekly evaluation metadata is not loaded as a new daily binary. A production artifact must be installed through the trusted local registry, never uploaded as an arbitrary pickle.

## Acceptance and recovery
Verify HTTPS liveness, authenticated readiness, real historical filter/pagination, wrong-token 401, missing-model response and real eligible forecast readback through the website. Test 7/14/30 independently. Snapshot `/data` (Parquet, manifests, SQLite and models), restore into a separate volume, and revalidate checksums before promoting it. No backup restoration or external deployment is claimed by these instructions.