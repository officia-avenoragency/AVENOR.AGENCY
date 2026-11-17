const { verifySession } = require("../../lib/master-auth");

async function getJson(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(9000), cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Remote service returned HTTP " + response.status);
  return body;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");
  if (!verifySession(req)) return res.status(401).json({ error: "Unauthorized" });

  const result = {
    timestamp: new Date().toISOString(),
    workforce: { configured: Boolean(process.env.WORKFORCE_API_URL && process.env.WORKFORCE_API_TOKEN), connected: false },
    whatsapp: { configured: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_KEY), connected: false },
  };

  const tasks = [];
  if (result.workforce.configured) {
    tasks.push((async () => {
      try {
        const base = process.env.WORKFORCE_API_URL.replace(/\/+$/, "");
        const data = await getJson(base + "/api/integration/overview", {
          Authorization: "Bearer " + process.env.WORKFORCE_API_TOKEN
        });
        result.workforce = { configured: true, connected: true, ...data };
      } catch (error) {
        result.workforce.error = error.message || "Could not connect to AI Workforce.";
      }
    })());
  }
  if (result.whatsapp.configured) {
    tasks.push((async () => {
      try {
        const base = process.env.WHATSAPP_API_URL.replace(/\/+$/, "");
        const data = await getJson(base + "/sessions", {
          Authorization: "Bearer " + process.env.WHATSAPP_API_KEY
        });
        const rows = Array.isArray(data) ? data : Array.isArray(data.sessions) ? data.sessions :
          Array.isArray(data.data) ? data.data : [];
        result.whatsapp = {
          configured: true,
          connected: true,
          sessionCount: rows.length,
          sessions: rows.map((row) => ({
            id: row.id || row.sessionId || row.session_id || null,
            name: row.name || row.id || row.sessionId || "WhatsApp session",
            status: row.status || row.state || "unknown",
            engine: row.engine || row.client || null
          }))
        };
      } catch (error) {
        result.whatsapp.error = error.message || "Could not connect to WhatsApp Control.";
      }
    })());
  }

  await Promise.all(tasks);
  return res.status(200).json(result);
};
