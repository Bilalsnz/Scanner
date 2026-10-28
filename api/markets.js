module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const raw = req.query && typeof req.query.q === "string" ? req.query.q : "ZEC";
  const q = raw.trim().slice(0, 48);
  if (!q || /[<>\\]/.test(q)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({ error: "Invalid search query" });
  }
  try {
    const upstream = await fetch("https://api.dexscreener.com/latest/dex/search?q=" + encodeURIComponent(q), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    const body = await upstream.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (!upstream.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).send(JSON.stringify({ error: "DEX Screener returned HTTP " + upstream.status }));
    }
    try {
      const parsed = JSON.parse(body);
      if (!parsed || (!Array.isArray(parsed.pairs) && parsed.pairs !== null)) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(502).json({ error: "DEX Screener returned an unexpected response shape" });
      }
      res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
      return res.status(200).send(JSON.stringify(parsed));
    } catch (_) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({ error: "DEX Screener returned invalid JSON" });
    }
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(502).json({ error: "Could not reach DEX Screener", detail: String(error && error.message ? error.message : error).slice(0, 180) });
  }
};
