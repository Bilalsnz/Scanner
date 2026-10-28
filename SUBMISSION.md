# ZEC SIGNAL · Submission Brief

## One-line pitch

**ZEC SIGNAL is a read-only market-intelligence terminal that helps users interrogate the evidence behind DEX pools quoted in a token labelled ZEC, instead of treating a ticker match as proof of authenticity or quality.**

Live app: https://scanner-five-navy.vercel.app/  
Source: https://github.com/Bilalsnz/Scanner

## The problem

A token symbol is not an identity. A pool whose quote token is labelled `ZEC` may use a bridged or synthetic asset, an unrelated token with the same ticker, or a token whose backing is unknown. At the same time, volume, liquidity, transaction counts and price changes are easy to over-interpret in thin or manipulated markets.

A useful scanner should not just rank markets. It should show what the provider actually reported, explain why a market was surfaced, and make uncertainty visible.

## What the product does

ZEC SIGNAL searches DEX Screener for four terms (`ZEC`, `Zcash`, `ZCAT`, and `MASK`), then retains indexed pairs whose provider-reported quote-token symbol is exactly `ZEC`. Results are deduplicated by chain and pair address.

The interface provides:

- **An explainable attention index (0–100):** turnover contributes up to 40 points, buy/sell transaction-count imbalance up to 30, and absolute 24-hour price movement up to 30. The inspector shows each component. The index is a deterministic research-priority heuristic, not a probability, safety score or trading recommendation.
- **Separate data-quality and market-context flags:** missing or zero liquidity, thin liquidity, missing token addresses, sparse activity, new pools, high turnover, count imbalance and large price moves are not silently blended into a single “safe/unsafe” verdict.
- **Market footprint:** reported liquidity distribution by network and the largest currently indexed pools by reported liquidity. Unknown values stay unknown rather than being presented as zero.
- **Analyst workflow:** network and liquidity filters, sorting, flagged-market view, browser-local watchlist, explorer links, CSV export and comparisons against the previous complete scan in the same browser.
- **Failure-aware behavior:** partial query failures are disclosed without discarding successful query results. Failed live scans never silently fall back to synthetic data. CSV export is blocked in example mode.
- **Address consistency checks:** quote-token addresses are compared across indexed pairs on the same network. Conflicts are surfaced, but consistency is explicitly not treated as proof of authenticity.

## Why the design is deliberately read-only

The product focuses on evidence gathering and market inspection. It does not connect a wallet, sign transactions, or execute trades. This reduces unnecessary permissions and keeps the submission focused on analysis rather than adding risky execution features that the available data cannot justify.

## Data and methodology

**Primary source:** DEX Screener's public API. The app retrieves provider search results through a same-origin Vercel serverless proxy.

The application only claims that the provider returned a pair with quote-token symbol `ZEC`. It does **not** currently independently verify quote-token contracts against an authoritative Zcash asset registry, establish 1:1 backing or redeemability, audit token permissions, prove organic trading, or calculate executable price impact.

The attention index uses these explicit, tiered rules:

| Component | Rule | Points |
| --- | --- | ---: |
| Volume / reported liquidity | At least 0.35× | 15 |
| Volume / reported liquidity | At least 1× | 25 |
| Volume / reported liquidity | At least 3× | 40 |
| Buy/sell count imbalance | At least 20 swaps, with buy share ≥67% or ≤33% | 30 |
| Absolute 24h price movement | At least 10% | 9 |
| Absolute 24h price movement | At least 20% | 18 |
| Absolute 24h price movement | At least 50% | 30 |

Only the highest matching tier within each component applies. Liquidity does not add attention points. Positive and negative price changes are treated alike. The score has not been calibrated against historical outcomes, and a zero score only means no configured scoring trigger fired.

## Architecture

- `index.html`: responsive, mobile-first UI and deterministic market calculations.
- `api/markets.js`: GET-only proxy to DEX Screener, with input validation, timeout, response-shape checks, short caching and explicit upstream errors.
- `tests/smoke.test.js`: no-dependency checks for frontend syntax, scoring boundaries, invalid/missing data, URL validation and API failure handling.
- `.github/workflows/ci.yml`: runs the smoke tests on pushes and pull requests.
- No paid API key, database, wallet connection or front-end package bundle is required.

## Suggested demo flow

1. Open the live app and run **Scan live markets**.
2. Explain that the returned pairs are search-index results, not a complete census.
3. Sort by the attention index and open **Inspect** on a market.
4. Show the point breakdown, field completeness, liquidity and volume context, quote-address consistency check, and explorer links.
5. Filter to flagged markets and compare networks in **Market footprint**.
6. Add a market to the watchlist, refresh again, and show the browser-local change comparison when a previous complete scan exists.
7. Export the filtered results to CSV.
8. Point out the identity limitation: a `ZEC` ticker match does not prove the asset is native ZEC or backed 1:1.

## Current limitations and next research steps

The scan is not exhaustive. DEX Screener search coverage can vary; provider values can be stale, incomplete or manipulated. Watchlists and scan comparisons are stored only in the user's browser, not in a shared historical database. The project does not yet implement an authoritative cross-chain asset registry, contract-risk analysis, holder concentration, trade-depth simulation, or historical anomaly baselines.

The next meaningful research upgrade is to establish and cite trusted token identities per network, then add historical liquidity/activity baselines and executable depth estimates from reliable sources. Until then, the UI deliberately labels those questions as unresolved.

## Validation

Run `npm test` with Node.js 20 or later. The GitHub Actions workflow provides an automated smoke-test result for the repository.

## Links

- Live: https://scanner-five-navy.vercel.app/
- Source: https://github.com/Bilalsnz/Scanner
- DEX Screener API reference: https://docs.dexscreener.com/api/reference
