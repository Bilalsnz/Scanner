# ZEC SIGNAL

A mobile-first, read-only market-intelligence scanner for indexed DEX pairs whose quote-token symbol is ZEC.

## Build 0.2.0

- Searches DEX Screener for ZEC, ZCAT, and MASK, then filters results to pairs where `quoteToken.symbol` is exactly `ZEC`.
- Displays provider-reported price, 24h change, liquidity, volume, and buy/sell transaction counts.
- Separates an **attention score** from **evidence coverage**. The attention score uses selected turnover, swap-count imbalance, and price-move indicators. Liquidity does not add points to the attention score.
- Separately flags zero, missing, and thin liquidity. A volume/liquidity ratio is not calculated when liquidity is missing or zero.
- Shows a per-pair explanation, market flags, data-field coverage, token addresses, pair address, pair age where available, provider link, and the app's fetch time.
- Shows scan age in the interface. The fetch time means when this app received a provider response, not when every underlying market field was last updated.
- Includes a clearly labelled synthetic example mode. Starting a live scan clears example values; example values are never silently substituted after an API failure.
- No wallet, trade execution, paid data dependency, or claim that quote-token backing is verified.

## Deploy

Deploy this repository to Vercel. The `api/markets.js` serverless function proxies the DEX Screener search endpoint to avoid relying on browser CORS. `index.html` calls the same-origin proxy. No build step or package installation is required.

## Data limitations

Source: https://docs.dexscreener.com/api/reference. Pair search is not exhaustive; only results returned for the configured queries are scanned. A ZEC quote symbol does not prove that the quote token is native ZEC, backed 1:1, redeemable, or issued by a trusted custodian. Data can be stale, incomplete, manipulated, or unavailable. The attention score is a research heuristic, not a prediction, safety rating, confidence score, or buy recommendation. Evidence coverage measures whether selected fields exist, not whether the information is true or trustworthy. Buy/sell counts are transactions, not unique traders, trade sizes, or net capital flow. No historical anomaly baseline is claimed.

Liquidity and volume totals include known provider values only; unknown values are not evidence of zero. A provider-reported zero liquidity value is kept distinct from missing liquidity. A displayed price may not be executable at a meaningful size.

The example layout uses synthetic values. Do not use them for trading.

## Endpoint

`GET /api/markets?q=ZEC`

Only GET is accepted. The query is length-limited and passed to the documented DEX Screener pair-search endpoint. Provider errors are surfaced to the UI; the app does not silently substitute demo values.

## License

MIT
