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
    return res.status(400).json({ error: "Missing PDF path" });
  }

  try {
    // Re-check allowlist + approval so revoked/unapproved students can't pull PDFs
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
      return res.status(403).json({ error: "Access revoked or not approved" });
    }

    const signRes = await fetch(
      `${process.env.SUPABASE_URL}/storage/v1/object/sign/batch1-pdfs/${encodeURIComponent(
        path
      )}`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 300 }), // short-lived: 5 minutes, re-fetched per PDF open
      }
    );

    const signData = await signRes.json();
    if (!signData.signedURL) {
      return res.status(404).json({ error: "PDF not found" });
    }

    return res.status(200).json({
      url: `${process.env.SUPABASE_URL}/storage/v1${signData.signedURL}`,
      email,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
