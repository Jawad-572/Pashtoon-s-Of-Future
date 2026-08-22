const { verifyAdminToken } = require("./_admin-auth");

module.exports = async (req, res) => {
  if (!verifyAdminToken(req.headers.cookie)) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/profiles?select=id,email,community_approved,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const rows = await r.json();
    return res.status(200).json({ profiles: rows });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
