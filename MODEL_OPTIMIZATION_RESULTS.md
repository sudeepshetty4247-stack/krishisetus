# Genuine optimization results — 13 November 2026

## Verified work
- Re-downloaded six official-history compilation files and reproduced **24,656,469** cleaned national records. SHA-256: `f14041fa0a154d22e717de38d9cf78c6eb6e27ab13af85edf81da2dbc4d68982`. This is sandbox verification, not online persistent hosting.
- Eight models executed on **758 genuine Hubli Local maize reports / 218 observed weeks**, with original chronological boundaries. Three configurations per trainable algorithm; historical-price/trend/volatility/seasonal features and expanding/156-week windows. Tuning objective is validation MAE, never test accuracy.
- Every tree refitted at each test origin using targets strictly before that origin. All algorithms have identical test observations within each horizon. Actual ties excluded only from direction metrics; ROC-AUC uses continuous predicted price change.
- All **24 horizon/model artifacts** saved, reloaded and prediction-checked locally. Full predictions and tuning trials preserved in `src/data/optimized-comparison.json`; the dashboard does not import that file and continues reading Cloud records.
- New optimized **7-day** summary published as a separate Cloud experiment; 14 preserved experiments now available. Eight algorithm options and nine charts, refresh and mobile verified with no page errors.
- Automatic GPS runs only when permission was already granted. Manual Dharwad suggestions and reverse identification checked. Approximate coordinates no longer determine the homepage's nearby radius; unverified district prices remain explicitly separate.

## Actual results: target not achieved
7-day final test: 33 price predictions; 32 direction samples (16 increases / 16 decreases; one unchanged excluded).

| Model | MAE ₹/q | RMSE ₹/q | Accuracy | F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Naive | 94.30 | 136.40 | 50.00% | 0.000 | 0.500 |
| Seasonal Naive | 150.28 | 191.93 | 59.38% | 0.581 | 0.656 |
| Random Forest | 120.65 | 156.54 | 68.75% | 0.722 | 0.707 |
| XGBoost | 115.88 | 144.37 | 68.75% | 0.688 | 0.719 |
| ARIMA | 98.55 | 135.63 | 65.63% | 0.703 | 0.773 |
| SARIMA | 97.29 | 134.64 | **71.88%** | **0.743** | 0.758 |
| LightGBM | 123.03 | 149.95 | 59.38% | 0.581 | 0.668 |
| CatBoost | 119.81 | 153.74 | 59.38% | 0.606 | 0.703 |

SARIMA remains the validation-MAE recommendation, but **does not beat Naive on test MAE** (₹2.99/q worse). Naive wins price MAE; SARIMA wins RMSE/accuracy/F1; ARIMA wins AUC. Random Forest and XGBoost direction accuracy improved from 62.5% to 68.75%, while their MAE worsened. Optimization did not universally improve performance.

Historical 14-day best accuracy: LightGBM **62.5%**, 32 samples. Historical 28-day best accuracy: LightGBM **71.43%**, 28 samples. These summaries are locally preserved, not yet in the optimized online record. They are not 30-day results.

85% is unsupported: sparse observations, small chronological tests, regime changes and omitted arrivals/weather/transaction costs limit demonstrated predictive information. No claim that extra features would necessarily attain the target; no test-period selection or synthetic observations used.

## Tests and remaining blockers
- 73 website + 63 Python tests passed before adding the final genuine-result regression test; final focused comparison test run is recorded separately.
- All 24 prediction sets independently recomputed; alignment and metric equality asserted. Local model reload is not deployed inference.
- Last stored daily run remains genuine success: 16,785 received/stored, reporting date 12 November. A new scheduled run was not verified here.
- Google Maps freshly linked in the new workspace. CEDA setup declined and remains unlinked; old workspace connection references no longer apply. Google live behavior remains unverified on an authorized origin.
- Still required: persistent HTTPS Python host/access with durable `/data`, `KRISHI_PYTHON_URL` and matching securely entered `KRISHI_PYTHON_TOKEN`; recent eligible exact-identity daily history for genuine current 7/14/30 forecasts; authoritative national yard directory; two-account acceptance, full seven-language review and hosted recovery testing.
- Website selling/account source checks and existing regression tests pass, but full populated selling CRUD was not re-executed in this pass. No claim of full production readiness or newly published frontend deployment.

**Overall: PARTIALLY COMPLETE.**