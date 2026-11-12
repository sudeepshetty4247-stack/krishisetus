# Location-first homepage and model comparison

## Verified in the preview
- Guest manual location autocomplete: Dharwad, Karnataka and Pune, Maharashtra returned genuine geographical suggestions without sign-in.
- Pune → Maize returned the actual district record, modal ₹2,800, minimum ₹2,700, maximum ₹2,900 on 12 November 2026; no distance is shown because a verified yard match is unavailable.
- Denied GPS kept manual selection available. Same-date historical Local maize comparison: Kalagategi ₹1,706 and Dharwar ₹1,600 on 18 April 2026, both clearly dated, without treating them as today's prices.
- Permission-granted browser GPS point resolved to Dharwad through OpenStreetMap reverse lookup; no address was inferred from a nearby market.
- Dharwad → Maize → Local returned the actual APMC Hubballi record: 12 November 2026, modal ₹3,018, minimum ₹1,809, maximum ₹3,140 per quintal.
- Selected market handoff carries its report ID, market identity, crop and quantity; repaired the previous default-variety mismatch while preserving legacy market-name links.
- Selected Hubballi 20 quintals → ₹60,360 gross, four expenses ₹1,000 + ₹200 + ₹300 + ₹400 → ₹58,460 net, checked through the actual existing selling UI.
- Separate `/model-comparison` page reads stored evaluation records, keeps earlier runs, filters crop/variety/market/state/district/algorithm/horizon/dataset version and refreshes records every 30 seconds.
- All six available algorithms have independently displayed validation/test metrics. Four comparison charts use only finite stored metrics; saved actual/predicted research values reuse the existing detail view.
- Genuine Hubli maize seven-day results: SARIMA validation MAE winner; Naive test MAE and sMAPE winner; SARIMA test RMSE and R² winner. No overall winner or production deployment claim.
- Source timestamps stay in a disclosure; reporting dates stay visible. Historical reports retain dates and comparison selection requires exact crop/variety/grade/source/unit/date compatibility.
- Desktop 1487×916 and mobile 390×844 checked without document overflow or runtime errors; charts inspected visually. Full website regression suite: 66 tests passed.

## Limitations
- Nationwide town lookup is available, but authoritative market coordinates remain limited to the existing Karnataka records. Outside coordinate coverage, actual district prices may be shown with no nearby-distance claim. Missing place/crop reports return an honest empty state.
- Public geographic providers may lack villages or transliterated names, be unavailable, or rate-limit requests. GPS has a manual fallback; town-centre origin is not the farmer's exact position.
- Persistent Python hosting, current daily trained artifacts and validated 7/14/30 inference remain unavailable. Historical weekly research includes 28 days, not 30; no substitution is made.
- Registry read uses the actual authenticated GET `/v1/models` contract. Missing connection is explicit; file availability alone never becomes a deployed/serving badge. A future successful model-loading/inference attestation is still required.
- Existing training/publishing pipeline is retained, not redeployed or retrained in this task. Training-completion persistence and new registry evidence are not verified against a hosted Python service.
- New changes are preview-only; no publication was requested in this task. Existing unrelated security findings and production-service blockers were not modified.