const { verifyToken } = require("./_auth");

module.exports = async (req, res) => {
  const email = verifyToken(req.headers.cookie);
  if (!email) {
    return res.status(401).json({ ok: false });
  }

  // Re-check the email is still on the allowlist (lets you revoke access
  // instantly by deleting a row in Supabase, even mid-session)
  try {
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
      return res.status(401).json({ ok: false });
    }
    return res.status(200).json({ ok: true, email });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
};
