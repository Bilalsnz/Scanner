# ZEC SIGNAL

A mobile-first, read-only market scanner for indexed DEX pairs whose quote-token symbol is ZEC.

## Build 0.5.0

- Makes the identity limitation explicit: the app currently matches a provider-reported quote-token symbol, and does not independently verify the asset against an authoritative Zcash registry.
- Renames “evidence coverage” to “field completeness” to avoid implying that present fields are independently verified.
- Clarifies that the attention index is a heuristic priority signal, not a risk probability. A zero score means no configured trigger fired, not that the market is safe.
- Fixes minimum-liquidity filtering so markets with unknown liquidity are not incorrectly treated as meeting a positive minimum threshold.
- Adds network, flagged-market, watchlist, liquidity, and ranking filters; CSV export respects the currently visible filtered market set.
- Adds a browser-local watchlist and compares reported liquidity/volume against the prior successful scan on the same browser. These observations are local-only and do not create a server-side historical database.
- Keeps successful query results when one of the configured searches fails, labels the scan partial, and reports how many queries failed instead of discarding all results.
- Shows each configured search term's success/failure and provider-returned pair count, making query coverage visible rather than presenting one unexplained total.
- Adds explorer links for supported networks and compares quote-token addresses across indexed pairs on the same network to surface symbol/address inconsistencies. Conflicting quote addresses appear in the flagged-market filter. This is a consistency check, not authoritative asset verification.
- Checks Solana quote mints against one curated OmniBridge ZEC reference address, links to the reference notes and Solscan, and clearly labels matches, non-matches, and networks without a configured reference. A match does not prove backing, bridge security or redeemability.
- Documents the attention index's full 100-point heuristic and shows the per-market point contribution from turnover, swap-count imbalance, and price movement.
- Every non-zero attention trigger now has a corresponding visible market flag, including turnover watch/elevated turnover and 10% price-move watch signals.
- Flags new pools, sparse activity, and missing token addresses without silently treating them as score points. Negative or blank numeric liquidity/volume/count fields are treated as invalid rather than being silently clamped to zero.
- Blocks CSV export while synthetic example mode is active.
- Adds no-dependency frontend/API smoke tests and a GitHub Actions workflow.

- Searches DEX Screener for ZEC, Zcash, ZCAT, and MASK, then filters results to pairs where `quoteToken.symbol` is exactly `ZEC`.
- Displays provider-reported price, 24h change, liquidity, volume, and buy/sell transaction counts.
- Uses an **attention index** on a documented 0–100 heuristic scale: turnover contributes up to 40 points, buy/sell count imbalance up to 30, and absolute 24h price movement up to 30. Liquidity warnings are separate and do not add score points. This is not calibrated to historical outcomes or a safety probability.
- Separately flags zero, missing, and thin liquidity, new pools, and sparse activity. A volume/liquidity ratio is not calculated when liquidity is missing or zero.
- Shows per-pair explanations, flags, token/pair addresses, pool age where available, provider links, supported chain explorer links, quote-address consistency checks, and the app's fetch time.
- Shows scan age in the interface. The fetch time means when this app received a provider response, not when every underlying market field was last updated.
- Adds a market-footprint view with known reported liquidity by network and the top indexed pools by reported liquidity. Networks with no known liquidity are shown as unknown rather than $0.
- Adds CSV export for the currently filtered market set, a browser-local watchlist, and previous-complete-scan comparisons for reported liquidity and volume.
- Includes a clearly labelled synthetic example mode. Starting a live scan clears example values; example values are never silently substituted after an API failure.
- No wallet, trade execution, paid data dependency, or claim that quote-token backing is verified.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Submission materials

See [SUBMISSION.md](SUBMISSION.md) for the product pitch, methodology, architecture, demo flow, and current limitations.

## Quality checks

Run npm test with Node.js 20 or later. GitHub Actions runs the no-dependency smoke tests on pushes and pull requests to main.

## Deploy

Deploy this repository to Vercel. The `api/markets.js` serverless function proxies the DEX Screener search endpoint to avoid relying on browser CORS. `index.html` calls the same-origin proxy. No build step or third-party package installation is required. The `vercel.json` file sets the API function timeout and baseline browser security headers.

## Data limitations

Source: https://docs.dexscreener.com/api/reference. Pair search is not exhaustive; only results returned for the configured queries are scanned. A ZEC quote symbol does not prove that the quote token is native ZEC, backed 1:1, redeemable, or issued by a trusted custodian. Data can be stale, incomplete, manipulated, or unavailable. The attention index is a research heuristic, not a prediction, risk probability, safety rating, confidence score, or buy recommendation. Field completeness measures whether selected fields exist, not whether the information is true or trustworthy. A zero score means no configured scoring trigger fired, not that the market is safe. Buy/sell counts are transactions, not unique traders, trade sizes, or net capital flow. No historical anomaly baseline is claimed. Independent quote-asset identity verification, contract-risk analysis, historical anomaly baselines, and executable trade-depth simulation are not implemented.

Liquidity and volume totals include known provider values only; unknown values are not evidence of zero. A provider-reported zero liquidity value is kept distinct from missing liquidity. A displayed price may not be executable at a meaningful size.

The example layout uses synthetic values. Do not use them for trading.

## Endpoint

`GET /api/markets?q=ZEC`

Only GET is accepted. The query is length-limited and passed to the documented DEX Screener pair-search endpoint. Provider errors are surfaced to the UI; the app does not silently substitute demo values.

## License

MIT
