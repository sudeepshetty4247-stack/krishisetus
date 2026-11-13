# India-wide crop-yield rebuild — executed research models

## Executed and saved
- Official Directorate of Economics and Statistics state-by-state reports retrieved directly from `https://data.desagri.gov.in/report/crop/horizontal_crop_vertical_year`, using the public reporting page and its session-bound form. 400,379 nonempty raw observations; 379,864 cleaned observations.
- Clean coverage: 37 historical state/UT labels (not 37 current states), 748 state–district identities, 50 crops, six seasons, 1997–2022. Administrative boundaries and reporting completeness change over time.
- Excluded invalid observations, conflicting business keys and non-tonne production units (cotton/jute/mesta bales; coconut nuts). Coconut tonne labeling also remains excluded pending unit resolution. Real zero yields retained. High yields flagged, not trimmed to improve scores.
- Primary target: production in tonnes / cultivated hectares = tonnes/hectare. Current production, published yield, calculated target and current cultivated area are prohibited inputs.
- IMD rainfall and minimum/maximum temperature downloads succeeded for 1995–2021: 81 checksum-recorded grid files. Rainfall is district-area-weighted across grid centres inside exact matched Census 2011 boundaries. Temperature uses enclosed 1-degree grid cells; districts without cells remain missing, never fabricated.
- Master dataset has real rainfall on 309,555 rows and mean temperature on 130,495 rows. Missing environmental values are recorded explicitly and median-imputed only by the fitted training preprocessor, with missingness indicators. These are not claimed as observed values.
- SoilGrids timed out. Soil, irrigation and land-use features are **not integrated**. NASA POWER temperature was tested successfully as an alternative, but not integrated into this run.
- Historical district spelling joins are exact after punctuation/case normalization. Unmatched/new districts are recorded, not silently attached to unrelated polygons. Historical boundaries do not prove present-day geographic equivalence.
- Six focused Python tests executed and passed for target units, bales exclusion, past-only features, frozen validation targets, retained zero yields and conflicting duplicate exclusion.

## Actual experiment checkpoint
Saved under `local-system/yield-output/`: raw, cleaned and processed Parquet, dataset audit, unmatched district report, environmental checksums, train/validation/test partitions, baseline artifact and aligned baseline predictions.

Eligible partitions: training through 2016; validation 2017–2019; final test 2020–2022. Combinations require five earlier observed training years. Validation crop history is frozen at 2016; test crop history is frozen at 2019. Weather is lagged two years under a January-1 pre-season hindcast cutoff. Target publication availability is conservatively assumed, not established by vintage release archives.

Completed baseline: log-target mean regression, final test **38,142 observations**, R² **−0.0584797631**, MAE **4.4468495206 t/ha**, RMSE **14.1755577957 t/ha**, MAPE **151.0747449%** (188 zero targets excluded), sMAPE **80.5955034%**. This weak baseline is not a usable selected model. Cross-crop aggregate errors are dominated by differing yield scales; per-crop results are saved in the evaluation report.

## Completed model comparison

All four models were trained on the same 254,156 training, 41,203 validation and 38,142 final-test observations. Two validation-only parameter configurations were evaluated for each tree model. Final artifacts refit training plus validation only; final test years remain unseen during fitting and selection.

| Model | Test R² | MAE t/ha | RMSE t/ha | MAPE % |
|---|---:|---:|---:|---:|
| Baseline | -0.058480 | 4.446850 | 14.175558 | 151.074745 |
| Random Forest | 0.864230 | 1.082599 | 5.076929 | 31.044829 |
| XGBoost | 0.870219 | 1.043326 | 4.963696 | 29.441214 |
| CatBoost | 0.866542 | 1.045930 | 5.033506 | 30.301708 |

XGBoost selected by lowest validation MAE (1.469686 t/ha), not by test score. R² 0.870 is explained variance, **not 87% prediction accuracy**. Validation R² is only 0.214; extreme official observations (e.g. Srikakulam onion 2017, 8,140 tonnes / 2 hectares = 4,070 t/ha) remain in evaluation rather than being deleted to inflate scores. Test/validation distribution differences must be disclosed. This is a limited two-configuration search, not exhaustive optimization.

Crop-specific XGBoost test R²: Wheat 0.793139; Maize 0.717064; Rice 0.217669; Onion 0.684483; Sugarcane 0.546448. The strong overall score does not imply strong performance for every crop. Test coverage: 32 historical state labels, 639 district identities, 49 crops and six seasons.

Separate deterministic district holdout: 131 districts, 7,445 test observations; XGBoost R² 0.546889, MAE 2.535379 t/ha. Held district target-history features removed; geographic performance is weaker. Feature importance is saved and is not causal evidence. Random Forest uses dense ordinal categorical IDs for computational tractability; boosting uses one-hot categories. No scaling is needed for these trees. All models use training-fitted median numeric imputation and log1p yield targets.

All four artifacts reloaded, full test predictions and all regression metrics independently recomputed to tolerance 1e-6. Python service authenticated predictions verified for Karnataka/Udupi/Rice, Punjab/Ludhiana/Wheat and Maharashtra/Pune/Maize (2021). Unsupported 2026 requests rejected; anonymous prediction calls rejected. 24 focused Python tests and 108 existing website tests passed. Desktop/mobile comparison, filters, preserved historical research and zero page errors verified.

## Integration and remaining limitations
The primary model-comparison page now displays actual yield results and coverage, with the previous price experiment behind a separate switch. Authenticated `/v1/yield/predict`, `/coverage` and `/report` endpoints mount inside the existing Python service, protected by its existing token boundary. Browser calls use the authenticated hosted proxy. Set KRISHI_YIELD_ROOT to the saved yield-output directory on the Python host.

Online inference remains blocked by the previously missing deployed Python URL/token; the successful local service tests do not claim a hosted connection. No arbitrary future forecast or 2026 yield is supported. Predictions are explicitly historical pre-season hindcasts for exact evaluated 2020–2022 rows, using saved feature inputs but never actual target/production. Soil, irrigation, release-vintage verification and recent-data forecasts remain unavailable. The separate viva handbook remains unfinished.

## Reproduce
Install the existing Python requirements plus `scipy`, `shapely`, `lxml`, `beautifulsoup4` for this pipeline. Run from the repository root:

```text
PYTHONPATH=local-system python -m pytest local-system/tests/test_yield_engine.py -q
PYTHONPATH=local-system python -m yield_engine --dataset local-system/yield-output/processed/master.parquet --output local-system/yield-output
```

Windows: set `PYTHONPATH=local-system` before the same Python commands. Dataset acquisition additionally requires Playwright/Chromium on the acquisition workstation only. `acquisition.acquire_production` saves report tables, not session tokens. `download_environment` records actual files and checksums. Training reruns are not needed merely to inspect the saved baseline checkpoint, and inference loads the saved artifacts without retraining.