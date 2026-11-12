# KRISHISETU technical audit

## Existing implementation

- TanStack Start / React 19 / TypeScript with Vite and Tailwind. It is not a Python/Flask application.
- Seven content routes with shared crop/language/report context and agricultural design tokens.
- CSV imports are in browser memory and disappear on reload. No application database or persistent ingestion exists.
- The CSV parser supports only five Dharwad markets and two commodities. This cannot serve nationwide ingestion.
- Report comparison enforces matching date and variety; net-value arithmetic has automated tests.
- Forecast and research pages explicitly show unavailable models. No model training, predictions, evaluation results or real source connector exists.
- Regional language dictionaries have English fallback; full professional translation coverage is not complete.
- No verified market geography, map, ingestion scheduler, Parquet layer, registry or historical backtesting exists.

## Deployment boundary

Lovable's preview and deployment run TanStack on a JavaScript/Cloudflare Worker runtime, not a Python process. A Flask service and SQLite file cannot be silently deployed there. Preserve the working preview; deliver the independently executable Python application separately. A hosted preview would require an externally reachable Python service and an explicit integration, while the local Flask application can run entirely on Windows.

## Implementation scope

Build a standalone local source delivery with Flask, SQLite metadata, partitioned Parquet, source provenance, audited CSV/Excel imports, bounded resumable official ingestion, dynamic nationwide catalogues, Python chronological model comparison, registry and scenario APIs. Preserve the preview's design assets and navigation in the local HTML/JavaScript interface. Real model results and nationwide counts remain unavailable until authorized source observations are actually ingested.

## Official access verification

Actual source checks and their timestamps are recorded in the standalone delivery. CEDA's published registration requires an API key. Documentation retrieval failed from this environment; do not implement speculative CEDA parameters. data.gov.in checks must report the actual response and never substitute synthetic rows. Neither service's credentials may be exposed to the browser.