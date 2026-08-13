const { verifyToken } = require("./_auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = verifyToken(req.headers.cookie);
  if (!email) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { path } = req.body || {};
  if (!path) {
    return res.status(400).json({ error: "Missing video path" });
  }

  try {
    // Re-check allowlist so revoked students can't keep pulling video URLs
    const lookup = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/batch1_students?email=eq.${encodeURIComponent(
        email
      )}&select=email&approved=eq.true`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const rows = await lookup.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ error: "Access revoked" });
    }

    const signRes = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/sign/batch1-videos/${encodeURIComponent(
        path
      )}`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 3600 }), // link works for 1 hour
      }
    );

    const signData = await signRes.json();
    if (!signData.signedURL) {
      return res.status(404).json({ error: "Video not found" });
    }

    return res.status(200).json({
      url: `${process.env.SUPABASE_URL}/storage/v1${signData.signedURL}`,
      email,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
