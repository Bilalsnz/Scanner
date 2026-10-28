# Changelog

## 0.5.0 · 2026-10-28

- Added per-query success/failure and provider pair counts so search coverage is visible.
- Kept successful query results when another query fails and preserved the previous complete-scan baseline during partial scans.
- Aligned every non-zero attention-index trigger with a visible market flag.
- Calibrated the deterministic attention index to a documented 100-point scale and exposed its component breakdown.
- Added market-footprint summaries, network and liquidity filters, flagged-market view, browser-local watchlist, previous-scan comparisons, CSV export, and supported explorer links.
- Added quote-address consistency checks and explicit identity limitations.
- Added a curated Solana OmniBridge ZEC reference-mint comparison, with source/explorer links and explicit limits: a match does not prove backing or redeemability.
- Added per-query success/failure and provider pair counts; partial scans remain usable and clearly disclose incomplete coverage.
- Improved validation for missing, blank, negative and malformed provider fields; blocked CSV export in synthetic example mode.
- Hardened the API proxy with bounded timeouts, no-store error responses, response-shape checks and baseline browser security headers.
- Added smoke tests and GitHub Actions CI.

## 0.3.0

- Clarified asset identity, field completeness and heuristic score limitations.
- Fixed minimum-liquidity filtering for unknown values.
