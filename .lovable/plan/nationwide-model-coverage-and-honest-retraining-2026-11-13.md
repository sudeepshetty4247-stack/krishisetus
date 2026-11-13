# Nationwide model coverage and honest retraining

## Goal
Replace the Hubli-maize-only impression with saved, reproducible evaluations across every genuinely eligible crop–variety–market time series available in India. Keep Random Forest, XGBoost and SARIMA as the only main models, with Naive as the baseline. Never optimize against the final test set or promise an accuracy threshold.

## Work
1. Reconnect the existing persistent Python service using its HTTPS URL and matching shared token; verify authenticated readiness and the active nationwide dataset checksum, coverage, and latest observed dates before training.
2. Use the service’s genuine available history to identify eligible series. Run bounded, chronological, purged validation separately by source, state, district, market, crop, variety, grade, and unit. Evaluate only the three requested models plus Naive; save artifacts, full aligned predictions, dataset provenance, and metrics for each eligible series. Keep unsupported series explicitly unavailable.
3. Publish only verified saved evaluations. Build a nationwide aggregate only from identical protocols and aligned test origins; retain crop-, variety-, state-, district-, and market-level results separately. Do not average unrelated accuracy percentages.
4. Correct the comparison screen so its initial view communicates nationwide coverage when compatible records exist, makes the Hubli record clearly an individual example, and states exact coverage, data cutoff, and unavailable groups. Keep the existing visual design and filters.
5. Run training/data tests and verify the actual saved records are read back by the website. Report measured scores and coverage, including when accuracy is below 85%.

## Blocker
This workspace currently has no Python service URL or shared token, and its nationwide history file is not present. The live report database has 100,601 reports across 29 states, but the longest observed single-market variety series is only 29 weeks; it cannot support the requested time-series retraining by itself. The user selected reconnecting the existing Python service. Training begins only after its URL/token are securely configured and its nationwide dataset is verified; do not fabricate a replacement dataset or infer deployment access.
