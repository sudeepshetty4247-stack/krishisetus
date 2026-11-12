# Make the farmer journey clear and usable

Preserve KRISHISETU’s existing colours, pages, accounts and real reports. Focus on the confusing screens in your screenshots—not a new design or invented data.

## Changes
- Turn Find Best Market into one compact sequence: crop and quantity → starting market → expenses and result. Remove large gaps and separate numbered boxes; do not show “Step 6” before a result exists.
- Keep nearby search optional and expandable beside the starting-market choice, rather than putting another location form before crop selection.
- Show a clear missing-selection or no-compatible-price message instead of an unexplained blank market selection. Keep the existing comparison rules and selling formulas unchanged.
- Put the most useful result first: reported price, your expenses and estimated net value. Keep source timestamps and price history available under clearly named expandable details.
- Replace the unrelated home-page “Market opportunity” windfall with crop-specific reported prices. Never present a distant apple price difference as a farmer’s potential income.
- Remove duplicate unavailable forecast notices. Explain simply when a forecast cannot be produced, keep actual price history accessible, and avoid a button implying that disconnected forecasting is working.
- Reduce page spacing, simplify farmer wording in Kannada and English, and preserve language selection and saved-plan controls.

## Verification
- Check the real maize 20-quintal journey, compatible reports, expense recalculation and existing plan controls.
- Check empty selections, uncommon/custom crops, unavailable forecasts and desktop/mobile layouts.
- Run existing regression tests and verify there are no preview errors.

## Technical scope
Frontend presentation and interaction only. Preserve source data, server integrations, authorization, comparison compatibility and Python formulas. Online Python deployment and nationwide coordinates remain separate blockers; this change cannot make unavailable forecasts real.
