# India-wide crop-yield rebuild — partial implementation

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

Random Forest training was interrupted before a completed candidate/checkpoint; XGBoost and CatBoost were not executed. No tree result, selected winner, feature importance, completed geographic test or nationwide production prediction is claimed.

## Not complete
The existing hosted dashboard and prediction API are unchanged. New yield inference/API/dashboard integration, complete tuning, unseen-district evaluation and artifact load/predict verification remain unfinished. Existing external Python service deployment remains unconfigured. Sandbox datasets alone do not establish hosted availability. Historical coverage does not support predicting 2026 or arbitrary future years.

## Reproduce
Install the existing Python requirements plus `scipy`, `shapely`, `lxml`, `beautifulsoup4` for this pipeline. Run from the repository root:

```text
PYTHONPATH=local-system python -m pytest local-system/tests/test_yield_engine.py -q
PYTHONPATH=local-system python -m yield_engine --dataset local-system/yield-output/processed/master.parquet --output local-system/yield-output
```

Windows: set `PYTHONPATH=local-system` before the same Python commands. Dataset acquisition additionally requires Playwright/Chromium on the acquisition workstation only. `acquisition.acquire_production` saves report tables, not session tokens. `download_environment` records actual files and checksums. Training reruns are not needed merely to inspect the saved baseline checkpoint, but inference is not yet implemented.