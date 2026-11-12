# Academic model comparison — verified historical research

## What changed
Only the separate Model Performance & Comparison experience was redesigned. Farmer pages, selling rules, accounts and ingestion remain unchanged. Nine readable metric charts, a six-model table, independent winners, validation-based recommendations, algorithm explanations and optional technical details replace the monitoring-heavy layout.

## Genuine input and execution
- Source: data.gov.in variety-wise history, existing checksum-validated national Parquet.
- Case study: Karnataka / Dharwad / Hubli (Amaragol), Maize, Local.
- Official trailing APMC suffix is normalized consistently with the existing weekly pipeline; no unrelated market is merged.
- 758 genuine daily reports, 218 observed weeks, 1 Jan 2021–16 Apr 2026. Weekly target is the mean of observed daily median prices across reported grades, INR/quintal.
- Training week labels: 28 Dec 2020–8 Jan 2024; validation: 15 Jan–30 Sep 2024. The first week starts before the first daily report; no December daily price is invented.
- Chronological train/validation/test boundaries share the same origin design. Training targets are purged before validation. Tree test predictions refit every four eligible origins on observed targets; ARIMA/SARIMA parameters are pre-test and filtered forward using past data.
- New independent run: academic-direction-2026-11-12T201908329509+0000. Original experiments remain unchanged and selectable. The 726-row intermediate check remains only in local runtime and is not presented.
- All six models executed, predictions saved at full precision, selected artifacts saved and reloaded locally. Verified result JSON is bundled in the website so the dashboard does not depend on an unavailable Python host; this is executed research evidence, not live inference.

## Seven-day test result
33 aligned regression predictions; 32 binary direction samples after excluding one unchanged actual target. Balance: 16 increases / 16 decreases; no missing predictions.

| Model | MAE | RMSE | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|---:|---:|
| Naive | 94.30 | 136.40 | 50.0% | Not available | 0.0% | 0.0% | 0.500 |
| Seasonal Naive | 150.28 | 191.93 | 59.4% | 60.0% | 56.3% | 58.1% | 0.656 |
| Random Forest | 118.51 | 151.12 | 62.5% | 61.1% | 68.8% | 64.7% | 0.719 |
| XGBoost | 110.94 | 144.40 | 62.5% | 62.5% | 62.5% | 62.5% | 0.703 |
| ARIMA | 98.55 | 135.63 | 65.6% | 61.9% | 81.3% | 70.3% | 0.773 |
| SARIMA | 97.29 | 134.64 | 71.9% | 68.4% | 81.3% | 74.3% | 0.758 |

Naive leads test MAE and sMAPE. SARIMA leads test RMSE, R², Accuracy and F1; ARIMA leads ROC-AUC. SARIMA is the price research recommendation selected by validation MAE, but its final-test MAE is ₹2.99/quintal worse than Naive. Validation F1 identifies ARIMA as the direction candidate, not the test F1 winner. No universal or production winner is declared.

## Direction methodology
Derive labels from actual target minus observed origin price: increase is positive; actual ties excluded. Prediction score is predicted price minus observed origin price; positive means increase, zero/negative means non-increase. ROC-AUC uses this continuous score. Undefined precision (no predicted increases), single-class AUC and absent records are null / Not available. Naive's zero-change score has chance AUC; its binary tie rule is explicit. Direction measures the selected endpoint, not a daily path.

## Verification
- 70 frontend tests and 59 Python tests pass; three existing Python dependency/convergence warnings remain.
- Live local website exercised: all four regression and five direction charts across validation/test and 7/14/28-day horizons, six-row tables, 13 selectable experiments, missing-direction states on old records, 1280px desktop and 390px mobile without horizontal page overflow or runtime errors.
- Build/typecheck signal: build OK after correcting strict optional types.
- Previous stored results and model artifacts were not overwritten. New reports and selected binaries are in local runtime; only verified evaluation records/predictions are included in website source.

## Limitations
Historical weekly horizons are 7, 14 and 28 days, not 30 days. Sparse reports are not imputed as targets. These results do not establish current forecasting, online artifact loading, persistent Python deployment or nationwide inference. Those still need persistent hosting and recent eligible exact-identity data. No external credential, paid LLM API, database schema or farmer workflow was changed. This change is verified in the running preview, not newly published to production.