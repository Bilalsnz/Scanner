module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const raw = typeof req.query.q === "string" ? req.query.q : "ZEC";
  const q = raw.trim().slice(0, 48);
  if (!q || /[<>\\]/.test(q)) return res.status(400).json({ error: "Invalid search query" });
  try {
    const upstream = await fetch("https://api.dexscreener.com/latest/dex/search?q=" + encodeURIComponent(q), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    const body = await upstream.text();
    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (!upstream.ok) return res.status(502).send(JSON.stringify({ error: "DEX Screener returned HTTP " + upstream.status }));
    try {
      const parsed = JSON.parse(body);
      if (!parsed || (parsed.pairs !== null && parsed.pairs !== undefined && !Array.isArray(parsed.pairs))) {
        return res.status(502).json({ error: "DEX Screener returned an unexpected response shape" });
      }
      return res.status(200).send(JSON.stringify(parsed));
    } catch (_) {
      return res.status(502).json({ error: "DEX Screener returned invalid JSON" });
    }
  } catch (error) {
    return res.status(502).json({ error: "Could not reach DEX Screener", detail: String(error && error.message ? error.message : error).slice(0, 180) });
  }
};
