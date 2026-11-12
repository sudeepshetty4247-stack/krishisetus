# KRISHISETU

## Final farmer completion request
- [x] Retrieved four genuine CEDA historical maize reports, persisted and read back publicly; missing units/varieties explicitly exclude them from comparable selling reports. Added authenticated bounded ingestion with retry and failure logs.
- [x] Added editable guest selling plans with kg/quintal/tonne, location, date, per-market costs, download and share; browser verified save/edit/reload/download without invented prices.
- [x] Fixed location/distance grid, invisible text inputs, header collision and no-data clipping; source-driven accessible ticker retains honest no-data state.
- [x] Added separate IST reporting/retrieval/successful-refresh timestamps and source-specific previous-observation movement.
- [x] Audited thirteen pages and location controls at 1054/768/390 widths; no overflow or runtime errors; all 21 frontend tests pass.
- [ ] Verify current comparable prices, automatic history updates, scrolling ticker with current reports and genuine net-ranking journey — source denies current requests or omits variety/units; authenticated CEDA browser request timed out, while one-off historical retrieval succeeded.
- [ ] Verify live nearby routing and full seven-language/local parity — Maps needs an authorized deployment and verified price-market identity matching; new labels currently Kannada/English fallback.
- [ ] Execute real historical training and deployed forecasting — requires accessible verified history and a Python deployment target.

## Production implementation (current request)
- [x] Rechecked linked CEDA (catalogue 200, market timeout), exact public AGMARKNET (403), data.gov.in (connection failure), e-NAM (404 page), ReMS (TLS failure); retained access controls and licensing caveats.
- [x] Implemented monthly resumable AGMARKNET ingestion, explicit unit mapping, audited export, transactional official-only hosted publication and hourly managed callback.
- [x] Added permission-based location control, manual town search, bounded authenticated Google Places discovery and on-demand road routing; existing farmer design preserved.
- [x] Added seasonal naive/SARIMA, full-market forecast lookup, publication freshness/baseline/error gates, atomic job files, online backups, container deployment and bounded retraining scheduler.
- [x] Verified 39 Python tests and 17 frontend tests; signed-in Kannada denied-location fallback, protected callback (401), research navigation and mobile no-overflow; no runtime errors.
- [ ] Execute comparable historical publication and real-data model evaluation — four CEDA observations retrieved but lack units/varieties; no eligible training dataset or Python deployment.
- [ ] Verify permitted-location Google Maps, road routing and price-directory matching — Maps live checks unsupported in sandbox; requires authorized deployed origin and source-backed market identity matching.
- [ ] Deploy persistent HTTPS Python service and verify refresh/retraining — no external hosting target or Python URL/token configured; container supplied but not deployed.
- [ ] Complete real-data maize 20-quintal journey including trained forecasts and saved comparisons — waits on official reports and Python deployment, not substituted fixtures.
- [ ] Distributed jobs, sparse-calendar/arrivals ML, real-time drift monitoring, configurable alerts, directory matching and full local/research translation parity — require deployment/data contracts and editorial review; not production-complete.
- [ ] Hosted request rate limiting — no standard platform primitive; a custom limiter requires explicit trade-off confirmation.

## Current website completion
- [x] Persistent hosted schema, owner-private CSV/XLSX imports, source checks and import history implemented.
- [x] Eleven visible pages, national dataset filters, paginated reports, source-dated charts and Python action controls implemented.
- [x] Authenticated isolated Python service, training jobs, comparison and same-day historical strategy simulation; 33 Python tests pass.
- [x] Correct CEDA versioned contract, secure authorized connector, live commodity/geography discovery and website retrieval controls.
- [x] Public eleven-page navigation, empty states, source check and mobile overflow verified; eight preview tests pass.
- [ ] Authorized research import create/read/delete verification — a signed-in account is now available, but no research/admin role has been granted; no automatic promotion.
- [ ] Genuine reports and executed research evaluation — CEDA catalogue reads succeed but markets/prices calls currently return upstream timeout.
- [ ] Hosted Python execution — requires a reachable HTTPS Python service; hosted runtime cannot run Python.
- [ ] Finish full seven-language text coverage, advanced opportunity analytics and complete local website feature parity.

- [x] Preview foundation: Kannada-first navigation, farmer dashboard and data transparency.
- [x] Preview CSV validation, basic coverage audit, reported-price comparison and expense-based selling calculation.
- [x] Preview historical charts, research availability and help views.
- [ ] Complete official persistent ingestion — requires a valid price response with verified variety/units or an authorized export.
- [ ] Validated Python forecasting, model registry, SHAP and historical backtesting — requires sufficient verified historical data.
- [ ] Verified market coordinates and map — requires verified APMC coordinates.
- [ ] Full seven-language editorial review and translation coverage — regional language dictionaries currently fall back to English for untranslated details; professional translation review remains outstanding.
- [x] Source investigation corrected: CEDA /v1 with bearer authentication works for commodities and geographies; market and price requests timed out; data.gov.in connection failed.
- [x] Local Flask/SQLite/Parquet foundation, CSV/XLSX import, dynamic nationwide catalogues, net-value/break-even APIs and automated tests; tested on Linux, Windows launcher not executed.
- [x] Python baseline/ARIMA/Random Forest/XGBoost training and registry code with purged chronological evaluation, forecast endpoint and SHAP support; no official-data-trained models bundled.
- [ ] Complete production nationwide ingestion and data retrieval — CEDA response availability and data.gov.in authorized access or genuine historical exports required.
- [ ] Complete local feature parity, charts, full translations, maps, alerts and automatic retraining — source-dependent analytics and review remain unfinished.
- [ ] Connect the existing preview to an available Python service without changing its design — hosted Lovable cannot execute Python; requires an externally reachable Python deployment or local execution.
- [ ] Retrieve genuine source observations, execute model comparison and publish a reproducible research evaluation — requires authorized source access or a verified historical file.
## Farmer-first rebuild (Nov 2026)
- [x] Compact 5-item nav + More menu + mobile bottom bar; Farmer/Research modes share one dataset.
- [x] New home (quick sell form, latest prices, same-day opportunity, how-it-works, trust).
- [x] Guided Find Best Market: crop cards, quantity, starting market, per-market expenses, net ranking, break-even, save/download/share.
- [x] Market Prices with detail sheet, Compare (2–5 markets), Price Trends, My Selling Plan, How It Works, About.
- [x] CSV/Excel import moved to Research → Data quality only.
- [x] Farmer pages translated in all 7 languages (research pages still en/kn only).
- [ ] Real official prices — CEDA is connected, but report requests time out; public AGMARKNET returns 403 and data.gov.in cannot connect.
- [ ] Python forecasts/model metrics — blocked: no hosted Python service URL configured.
- [ ] Market map / road distance — Google Maps connected and discovery/routing code implemented; deployed-origin verification and price-market matching remain outstanding.
