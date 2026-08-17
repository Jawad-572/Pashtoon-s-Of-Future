const { verifyAdminToken } = require("./_admin-auth");
const { generatePassword, hashPassword } = require("./_password");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!verifyAdminToken(req.headers.cookie)) {
    return res.status(401).json({ error: "Not authorized" });
  }

  const { email, approve } = req.body || {};
  if (!email || typeof approve !== "boolean") {
    return res.status(400).json({ error: "Missing email or approve flag" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    let generatedPassword = null;
    let updateBody = { approved: approve };

    if (approve) {
      // Check if this student already has a password set
      const lookup = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/batch1_students?email=eq.${encodeURIComponent(
          cleanEmail
        )}&select=password_hash`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const rows = await lookup.json();
      const hasPassword = Array.isArray(rows) && rows[0] && rows[0].password_hash;

      if (!hasPassword) {
        generatedPassword = generatePassword(8);
        const { hash, salt } = hashPassword(generatedPassword);
        updateBody.password_hash = hash;
        updateBody.password_salt = salt;
      }
    }

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
        body: JSON.stringify(updateBody),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: errText });
    }

    return res.status(200).json({ ok: true, generatedPassword });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
