const { verifyAdminToken } = require("./_admin-auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!verifyAdminToken(req.headers.cookie)) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const { id, approve } = req.body || {};
  if (!id || typeof approve !== "boolean") {
    return res.status(400).json({ error: "Missing id or approve flag" });
  }

  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ community_approved: approve }),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: errText });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
