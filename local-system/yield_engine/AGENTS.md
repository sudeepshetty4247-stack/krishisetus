# Yield research architecture
- Keep yield artifacts and targets separate from market-price research to prevent metric and unit confusion.
- Use identical chronological partitions with two-year input lags and validation-only model selection; preserve suspicious targets so test scores are not inflated by trimming.
- Publish saved evaluations separately from hosted inference readiness; the Worker cannot execute Python or read local Parquet.
- Persist oversized artifacts as checksum-verified parts and trust only registered local model files, never uploaded pickles.
