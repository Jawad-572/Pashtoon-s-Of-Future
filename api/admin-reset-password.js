const { verifyAdminToken } = require("./_admin-auth");
const { generatePassword, hashPassword } = require("./_password");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!verifyAdminToken(req.headers.cookie)) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const newPassword = generatePassword(8);
  const { hash, salt } = hashPassword(newPassword);

  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/batch1_students?email=eq.${encodeURIComponent(
        cleanEmail
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ password_hash: hash, password_salt: salt }),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: errText });
    }

    return res.status(200).json({ ok: true, newPassword });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
