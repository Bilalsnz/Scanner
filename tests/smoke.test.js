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
  'function renderFootprint',
  'TOP REPORTED LIQUIDITY',
  'if(failedQueries.length===0)writeStore',
  'CSV export is disabled in example mode',
  'components:{turnover:turnoverPoints'
]) assert.ok(html.includes(marker), 'missing product guardrail or feature: ' + marker);

assert.ok(html.includes('typeof v==="string"&&v.trim()===""'), 'empty strings must not count as valid numeric data');
assert.ok(html.includes('min===0||(p._a.liqKnown&&p._a.liq>=min)'), 'unknown liquidity must not satisfy a positive minimum');
assert.ok(html.includes('A score of 0 means no configured scoring trigger fired'), 'zero attention index must not be presented as safety');

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
