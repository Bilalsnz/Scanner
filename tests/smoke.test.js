const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
assert.equal(packageJson.version, '0.5.0', 'package and app release versions should match');
assert.equal(vercelConfig.functions['api/markets.js'].maxDuration, 10);
assert.ok(vercelConfig.headers.some((rule) => rule.headers.some((header) => header.key === 'X-Content-Type-Options')));
assert.ok(fs.existsSync(path.join(__dirname, '..', 'favicon.svg')), 'branded favicon should exist');
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
assert.equal(inlineScripts.length, 1, 'expected one inline application script');
for (const script of inlineScripts) new Function(script);

for (const marker of [
  'QUOTE IDENTITY UNVERIFIED',
  'Field completeness',
  'LIMITS OF THE REFERENCE CHECK',
  'function referenceCheck(p)',
  'QUOTE REFERENCE UNMATCHED',
  'quote_reference_status',
  'function exportCsv',
  'zec-signal-watchlist-v1',
  'zec-signal-snapshot-v1',
  'function identityCheck',
  'No synthetic data has been substituted',
  'liquidity does not contribute to the attention index',
  'function identityCheck',
  'function exportCsv',
  'CSV export is disabled in example mode',
  'Promise.allSettled',
  'PARTIAL SCAN',
  'No matching pairs were found in successful queries',
  'QUOTE ADDRESS MISSING',
  'Attention index breakdown',
  'function renderFootprint(){const root=',
  'id="queryCoverage"',
  "queries[i]+' '+(x.status==='fulfilled'",
  'TOP REPORTED LIQUIDITY',
  'if(failedQueries.length===0)writeStore',
  'CSV export is disabled in example mode',
  'components:{turnover:turnoverPoints'
]) assert.ok(html.includes(marker), 'missing product guardrail or feature: ' + marker);

assert.ok(html.includes('typeof v==="string"&&v.trim()===""'), 'empty strings must not count as valid numeric data');
assert.ok(html.includes('min===0||(p._a.liqKnown&&p._a.liq>=min)'), 'unknown liquidity must not satisfy a positive minimum');
assert.ok(!html.includes('function renderFootprint(){function renderFootprint(){'), 'market footprint renderer must not be accidentally nested');
assert.ok(html.includes('renderFootprint();'), 'market footprint must be refreshed with scan results');
assert.ok(html.includes('A score of 0 means no configured scoring trigger fired'), 'zero attention index must not be presented as safety');

const safeFnMatch = inlineScripts[0].match(/function safeMarketUrl\(value\)\{[^\n]+\}/);
assert.ok(safeFnMatch, 'market URL validator must exist');
const safeMarketUrl = new Function('URL', safeFnMatch[0] + '; return safeMarketUrl;')(URL);
assert.equal(safeMarketUrl('https://dexscreener.com/solana/example'), 'https://dexscreener.com/solana/example');
assert.equal(safeMarketUrl('https://www.dexscreener.com/solana/example'), 'https://www.dexscreener.com/solana/example');
assert.equal(safeMarketUrl('javascript:alert(1)'), 'https://dexscreener.com');
assert.equal(safeMarketUrl('https://evil.example/path'), 'https://dexscreener.com');

const tokenExplorerStart = inlineScripts[0].indexOf('function tokenExplorerUrl(chain,address){');
const tokenExplorerEnd = inlineScripts[0].indexOf('\\nfunction identityCheck(p)', tokenExplorerStart);
assert.ok(tokenExplorerStart >= 0 && tokenExplorerEnd > tokenExplorerStart, 'token-specific explorer helper must be extractable');
const tokenExplorerUrl = new Function('encodeURIComponent', 'explorerUrl', inlineScripts[0].slice(tokenExplorerStart, tokenExplorerEnd) + '; return tokenExplorerUrl;')(encodeURIComponent, (chain, address) => 'https://example.test/' + chain + '/' + address);
assert.equal(tokenExplorerUrl('solana', 'MintABC'), 'https://solscan.io/token/MintABC');
assert.equal(tokenExplorerUrl('bsc', '0xABC'), 'https://example.test/bsc/0xABC');
assert.equal(tokenExplorerUrl('solana', ''), null);

const refStart = inlineScripts[0].indexOf('function referenceCheck(p){');
const refEnd = inlineScripts[0].indexOf('\nfunction knownPrice(v)', refStart);
assert.ok(refStart >= 0 && refEnd > refStart, 'curated token-reference check must be extractable');
const referenceCheck = new Function(inlineScripts[0].slice(refStart, refEnd) + '; return referenceCheck;')();
const omniMint = 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS';
assert.equal(referenceCheck({ chainId: 'solana', quoteToken: { address: omniMint } }).status, 'match');
assert.equal(referenceCheck({ chainId: 'solana', quoteToken: { address: 'another-mint' } }).status, 'unmatched');
assert.equal(referenceCheck({ chainId: 'ethereum', quoteToken: { address: '0x123' } }).status, 'not_configured');
assert.equal(referenceCheck({ chainId: 'solana', quoteToken: {} }).status, 'unavailable');

const calcStart = inlineScripts[0].indexOf('function calc(p){');
const calcEnd = inlineScripts[0].indexOf('\nfunction norm(p)', calcStart);
assert.ok(calcStart >= 0 && calcEnd > calcStart, 'market scoring function must be extractable for tests');
const calcSource = inlineScripts[0].slice(calcStart, calcEnd);
const calc = new Function('usd', 'num', calcSource + '; return calc;')(
  (value) => '$' + Number(value).toFixed(2),
  (value) => Number.isFinite(Number(value)) ? Number(value) : 0
);
const fullySignalled = calc({
  chainId: 'solana', pairCreatedAt: Date.now() - 2 * 86400000,
  liquidity: { usd: 100 }, volume: { h24: 300 }, priceChange: { h24: 50 },
  txns: { h24: { buys: 70, sells: 30 } },
  baseToken: { address: 'base' }, quoteToken: { address: 'quote' }, pairAddress: 'pair'
});
assert.equal(fullySignalled.score, 100, 'the three documented components should sum to 100');
assert.deepEqual(fullySignalled.components, { turnover: 40, imbalance: 30, move: 30 });
const watchSignals = calc({
  liquidity: { usd: 100 }, volume: { h24: 50 }, priceChange: { h24: 10 },
  txns: { h24: { buys: 2, sells: 2 } },
  baseToken: { address: 'base' }, quoteToken: { address: 'quote' }, pairAddress: 'pair'
});
assert.equal(watchSignals.score, 24, '0.35x turnover and a 10% move should add 15 and 9 points');
assert.ok(watchSignals.flags.includes('TURNOVER WATCH'), 'a scored turnover watch must be visible as a flag');
assert.ok(watchSignals.flags.includes('PRICE MOVE WATCH'), 'a scored 10% move must be visible as a flag');
const elevatedTurnover = calc({
  liquidity: { usd: 100 }, volume: { h24: 200 }, priceChange: { h24: 0 },
  txns: { h24: { buys: 10, sells: 10 } },
  baseToken: { address: 'base' }, quoteToken: { address: 'quote' }, pairAddress: 'pair'
});
assert.ok(elevatedTurnover.flags.includes('ELEVATED TURNOVER'), 'a 1x to 3x turnover score must have a matching flag');
const missingLiquidity = calc({
  liquidity: { usd: '' }, volume: { h24: 50 }, priceChange: { h24: 0 },
  txns: { h24: { buys: 2, sells: 2 } },
  baseToken: { address: 'base' }, quoteToken: { address: 'quote' }, pairAddress: 'pair'
});
assert.equal(missingLiquidity.liqKnown, false);
assert.equal(missingLiquidity.ratio, null);
assert.ok(missingLiquidity.flags.includes('LIQUIDITY UNKNOWN'));
assert.ok(!missingLiquidity.flags.includes('ZERO LIQUIDITY'), 'blank liquidity must not become zero');
const zeroLiquidity = calc({
  liquidity: { usd: 0 }, volume: { h24: 50 }, priceChange: { h24: 0 },
  txns: { h24: { buys: 2, sells: 2 } },
  baseToken: { address: 'base' }, quoteToken: { address: 'quote' }, pairAddress: 'pair'
});
assert.equal(zeroLiquidity.ratio, null);
assert.ok(zeroLiquidity.flags.includes('ZERO LIQUIDITY'));

const handler = require('../api/markets.js');
async function invoke(req, fetchImpl) {
  const originalFetch = global.fetch;
  if (fetchImpl) global.fetch = fetchImpl;
  const result = { headers: {}, status: 200, body: undefined };
  const res = {
    setHeader(k, v) { result.headers[k.toLowerCase()] = v; },
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
    send(body) { result.body = body; return this; }
  };
  try { await handler(req, res); } finally { global.fetch = originalFetch; }
  return result;
}

(async () => {
  const method = await invoke({ method: 'POST', query: {} });
  assert.equal(method.status, 405, 'non-GET requests must be rejected');
  assert.equal(method.headers.allow, 'GET');

  const invalid = await invoke({ method: 'GET', query: { q: '<script>' } });
  assert.equal(invalid.status, 400, 'unsafe query characters must be rejected');
  assert.equal(invalid.headers['cache-control'], 'no-store');

  let requestedUrl = '';
  const ok = await invoke({ method: 'GET', query: { q: 'ZEC' } }, async (url) => {
    requestedUrl = url;
    return { ok: true, status: 200, text: async () => JSON.stringify({ pairs: [] }) };
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(JSON.parse(ok.body), { pairs: [] });
  assert.ok(requestedUrl.includes('q=ZEC'));
  assert.ok(ok.headers['cache-control']);

  const upstream = await invoke({ method: 'GET', query: { q: 'ZEC' } }, async () => ({
    ok: false, status: 429, text: async () => 'rate limited'
  }));
  assert.equal(upstream.status, 502, 'upstream failures must be surfaced as gateway errors');
  assert.equal(upstream.headers['cache-control'], 'no-store', 'upstream errors must not be cached');

  const network = await invoke({ method: 'GET', query: { q: 'ZEC' } }, async () => {
    throw new Error('offline');
  });
  assert.equal(network.status, 502, 'network failures must not be disguised as live data');
  assert.equal(network.headers['cache-control'], 'no-store', 'network errors must not be cached');

  const badShape = await invoke({ method: 'GET', query: { q: 'ZEC' } }, async () => ({
    ok: true, status: 200, text: async () => JSON.stringify({ pairs: 'not-an-array' })
  }));
  assert.equal(badShape.status, 502, 'unexpected provider response shapes must be rejected');
  assert.equal(badShape.headers['cache-control'], 'no-store');

  const missingPairs = await invoke({ method: 'GET', query: { q: 'ZEC' } }, async () => ({
    ok: true, status: 200, text: async () => JSON.stringify({ schemaVersion: '1.0.0' })
  }));
  assert.equal(missingPairs.status, 502, 'provider responses missing the pairs field must be rejected');
  assert.equal(missingPairs.headers['cache-control'], 'no-store');

  console.log('ZEC SIGNAL checks passed: frontend syntax, product guardrails, filters and API failure handling.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
