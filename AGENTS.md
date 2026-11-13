<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Keep the shared React context in a separate hot-refresh-stable module so provider edits cannot disconnect mounted page consumers; retain context identity only, never account values.
- Hosted reports persist in Cloud with owner-scoped import policies and public read access only to source-verified records; private uploads must never become public merely because they name an official source.
- Actual analysis and training run through an authenticated server proxy to the isolated Python service; return an explicit unavailable state when no service is configured.
- Share filters, language and paginated RLS-scoped queries through a root provider so all content routes use the same account dataset.
- CEDA calls use the documented versioned contract through the linked connector; keep response-schema and missing-unit failures explicit rather than inventing market varieties or units.
- Store incomplete provider observations separately from comparable reports, preserving raw fields; missing units or varieties must never enter net-selling rankings or model groups.
- Guest selling plans use versioned validated browser storage with report snapshots and unit normalization; editing and downloads remain available without accounts.
- Price movement and freshness helpers use source-specific distinct-date observations and IST calendar dates; connection checks never substitute for successful report retrieval.
- Never seed agricultural prices or render evaluation metrics without a verified input dataset and an executed validation pipeline.
- Keep the independent Flask/SQLite/Parquet source in `local-system`, outside the hosted application import graph; Python cannot execute in the Lovable hosted runtime.
- Local research groups are source/market/commodity/variety-specific, with direct calendar-horizon targets and purged chronological validation; this prevents source mixing and future-target leakage.
- Farmer pages live in `src/components/farmer/*` inside `AppShell`; research/admin pages reuse legacy `krishisetu.tsx` via `Layout` → `AppShell research`. Keeps farmer UX free of dataset/upload tooling.
- Selling math lives in `src/lib/selling.ts` (mirrors `local-system/intelligence_engine/decisions.py`) and is covered by `src/test/selling.test.ts`; keep both formulas identical.
- Farmer-facing copy is centralized in `src/lib/farmer-copy.ts` (English fallback for missing keys).
- Keep farmer source/history detail disclosures separate from the primary crop, costs and net result so technical provenance stays accessible without obstructing selling decisions.
- Official publication runs through an authenticated scheduled callback and a service-role-only transactional batch RPC; only fixed official connector observations qualify, never uploaded source assertions.
- Homepage guest locations use bounded public geocoding; Google Places/Routes remain authenticated. Join prices by exact market identity and show distance only for verified yards.
- Python deployment uses one persistent-volume service process with atomic job files and SQLite online backups; local loopback pages remain isolated from its authenticated service endpoints.
- Python container entrypoint is FastAPI with authenticated versioned endpoints and the compatible mounted Flask service; preserve the independent local Flask UI to avoid breaking Windows workflows.
- Analytical history is activated through checksum/count/business-key validation on a persistent Parquet volume and queried with bounded DuckDB pagination; sandbox files alone never establish hosted availability.
- Selling ranks require matching reporting date, crop, variety, grade, explicit quintal unit and source; uncertain geocoding is excluded from precise yard-distance ranking and road routing.
- Research imports and training require server-verified roles plus restrictive import policies; no account is promoted automatically.
- Current daily prices come from data.gov.in resource 9ef84268 (direct API when DATA_GOV_IN_API_KEY exists, else the GODL relay) via `src/lib/mandi-sync.server.ts` every 3 hours; every run is logged in agri_source_runs and success is recorded only when rows are stored.
- Long history comes from the GODL variety-wise compilation via `local-system/data_engine/history_import.py`; commodity names are canonicalised (no space before "(") identically in both pipelines.
- Nationwide historical preparation uses state-partitioned DuckDB aggregation and checksum manifests in `data_engine/nationwide_prepare.py` to keep memory bounded and provenance reproducible.
- Nationwide catalogue/coverage/ticker are precomputed into agri_summary after each sync because live aggregates exceed the statement timeout.
- Model comparison reads preserved Cloud experiments; Python tunes only on purged walk-forward validation, then compares identical test origins. Optional evaluated algorithms come from records; artifacts never imply deployed inference.
- Market coordinates in market_locations are geocoded official market names with a match-quality label; distances are straight-line unless a road route is requested.
- Crop discovery (`src/lib/crop-catalogue.ts`) classifies official catalogue names by keyword rules and marks entries official / alias / custom; custom crops can be saved in plans with no reports and never receive a price.
- Private plans and alerts use authenticated owner-scoped Cloud records; legacy browser records remain guest-only and are never silently assigned to an account.
- Account alerts use IST creation dates and source/grade snapshots; malformed payloads are skipped. Delivery is in-app only.
- Daily ingestion uses service-only leases and retryable batches; partial runs allow immediate retry and only complete success advances last_success.
- Forecast POST requests resolve exact source/market/crop/variety/grade identities in the daily registry; historical weekly artifacts remain separate from current daily inference.
