# Final focused improvement — 13 November 2026

## VERIFIED COMPLETE
- Research navigation exposes only Model Performance & Comparison. Existing underlying features and records retained; `/research` redirects to comparison.
- Three-chart dashboard: Accuracy/Precision/Recall/F1, ROC-AUC, MAE/RMSE. Public viewing, refresh, individual filters and compatible aggregate state checked. Fifteen saved experiments remain available; only three main models shown, Naive reference separate.
- Random Forest, XGBoost and SARIMA retrained on 758 genuine Hubli Local maize reports / 218 observed weeks, using past-only features, three validation-selected configurations and expanding/156-week training windows. Identical chronological test origins. Twelve artifacts (three historical horizons, plus baseline) saved, reloaded and prediction-checked locally.
- Seven-day full predictions saved in Cloud and read through UI; 14/28-day full evidence retained in `src/data/three-model-comparison.json`, not dashboard fallback data. Metrics independently recomputed.
- Best seven-day accuracy **SARIMA 71.875%**, not 85%. RF/XGBoost 68.75%. SARIMA precision 68.42%, recall 81.25%, F1 0.7429, ROC-AUC 0.7578, MAE ₹97.29/q, RMSE ₹134.64/q. Naive MAE ₹94.30/q is better. SARIMA leads the three main models, but does not beat the baseline on MAE.
- Homepage and market-price pages show real last successful fetch, reporting date, source, retrieval outcome and fetched/persisted counts; automatically refresh every 30 seconds. IST check: last successful completion 12 Nov 19:34 UTC becomes **13 Nov 1:04 AM IST**; latest reporting date remains **12 Nov**.
- Public manual Pune/Dharwad search and automatic already-permitted GPS identification checked. Mobile comparison and market page fit at 390px. No observed page errors.
- 78 website tests passed; final focused 21 website and 7 Python tests passed. Full Python run exceeded timeout after progress; not reported as passing.

## IMPLEMENTED BUT NOT VERIFIED
- Daily ingestion concurrency reduced to six and publication batches to 25 with existing bounded retries and duplicate-safe exact business-key upserts. Provider outage prevented testing successful writes with the new batch size.
- Managed three-hourly daily schedule and hourly official schedule exist and are active. Successful automatic scheduled delivery was not established from this run.
- Full multi-crop aggregate: implementation rejects mismatched protocol/source/frequency/grade/test periods or absent aligned predictions and excludes repeated experiments per identity. **Only one eligible combination currently exists**; UI explicitly says this is not nationwide overall performance.
- Persisted counts include refreshed existing records; new-only count is not available and is not invented.

## BLOCKED BY EXTERNAL REQUIREMENT
- Fresh data: actual authenticated homepage retrieval returned provider HTTP **530** and **0 fetched / 0 stored**, recorded in Cloud as **failed**. Previous success retained; 30,388 daily rows remain with latest date 12 Nov. No fresh-data success claimed.
- CEDA connection authorization was declined again. Requires completing authorized CEDA credentials/access via the connection card; no secrets invented.
- Direct data.gov.in resource 9ef84268: API key missing and direct test endpoint unreachable here. Obtain authorized official API access; no third-party endpoint is treated as connected solely from search results.
- Python inference requires persistent HTTPS hosting with durable data volume, `KRISHI_PYTHON_URL`, and matching securely entered `KRISHI_PYTHON_TOKEN`. Neither exists here. Local artifact loading does not establish deployment.
- Current 7/14/30 forecasts require recent eligible exact-identity daily history and connected service. Historical weekly 28-day results are not 30-day forecasts.
- Nationwide precise nearby ranking requires authoritative verified yard locations. Approximate town/district reports remain explicitly separate from yard distance.

**Overall: PARTIALLY COMPLETE. Fresh market-data persistence remains blocked, not fixed by displaying schedule success.**