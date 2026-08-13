const crypto = require("crypto");

function signToken(email) {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = Buffer.from(`${email}|${expires}`).toString("base64");
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  if (code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Access code is incorrect" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const lookup = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/batch1_students?email=eq.${encodeURIComponent(
        cleanEmail
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
      return res.status(403).json({ error: "This email is not on the Batch 1 list" });
    }

    const token = signToken(cleanEmail);
    res.setHeader(
      "Set-Cookie",
      `batch1_session=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=604800`
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error, try again" });
  }
};
