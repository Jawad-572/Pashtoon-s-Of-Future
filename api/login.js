const crypto = require("crypto");
const { verifyPassword } = require("./_password");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function signToken(email) {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = Buffer.from(`${email}|${expires}`).toString("base64");
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

async function patchStudent(email, body) {
  return fetch(
    `${process.env.SUPABASE_URL}/rest/v1/batch1_students?email=eq.${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    }
  );
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, code } = req.body || {}; // "code" field holds their personal password
  if (!email || !code) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const lookup = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/batch1_students?email=eq.${encodeURIComponent(
        cleanEmail
      )}&select=email,approved,password_hash,password_salt,failed_attempts,locked_until`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const rows = await lookup.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ error: "This email is not registered" });
    }

    const student = rows[0];

    // Check lockout
    if (student.locked_until && new Date(student.locked_until).getTime() > Date.now()) {
      const minsLeft = Math.ceil((new Date(student.locked_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many attempts. Try again in ${minsLeft} minute(s).` });
    }

    if (!student.approved) {
      return res.status(403).json({ error: "Your access hasn't been approved yet" });
    }

    if (!student.password_hash) {
      return res.status(403).json({ error: "No password set yet — contact the admin" });
    }

    const valid = verifyPassword(code, student.password_hash, student.password_salt);

    if (!valid) {
      const attempts = (student.failed_attempts || 0) + 1;
      const updateBody = { failed_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updateBody.locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
        updateBody.failed_attempts = 0;
      }
      await patchStudent(cleanEmail, updateBody);

      if (attempts >= MAX_ATTEMPTS) {
        return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
      }
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Success: reset attempt counter
    await patchStudent(cleanEmail, { failed_attempts: 0, locked_until: null });

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
