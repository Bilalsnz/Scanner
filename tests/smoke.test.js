const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
assert.equal(inlineScripts.length, 1, 'expected one inline application script');
for (const script of inlineScripts) new Function(script);

for (const marker of [
  'QUOTE IDENTITY UNVERIFIED',
  'Field completeness',
  'IDENTITY CHECK: UNVERIFIED',
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
  'QUOTE ADDRESS MISSING',
  'Attention index breakdown',
  'function renderFootprint(){const root=',
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

  const network = await invoke({ method: 'GET', query: { q: 'ZEC' } }, async () => {
    throw new Error('offline');
  });
  assert.equal(network.status, 502, 'network failures must not be disguised as live data');

  console.log('ZEC SIGNAL checks passed: frontend syntax, product guardrails, filters and API failure handling.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
