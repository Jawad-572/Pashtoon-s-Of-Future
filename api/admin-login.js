const { signAdminToken } = require("./_admin-auth");

const ADMIN_EMAIL = "jawadali_572@yahoo.com";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function getState() {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/admin_login_state?id=eq.1&select=*`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const rows = await r.json();
  if (Array.isArray(rows) && rows.length > 0) return rows[0];
  // Row doesn't exist yet, create it
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/admin_login_state`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ id: 1, failed_attempts: 0 }),
  });
  return { id: 1, failed_attempts: 0, locked_until: null };
}

async function patchState(body) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/admin_login_state?id=eq.1`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (String(email).trim().toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const state = await getState();

    if (state.locked_until && new Date(state.locked_until).getTime() > Date.now()) {
      const minsLeft = Math.ceil((new Date(state.locked_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Too many attempts. Try again in ${minsLeft} minute(s).` });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      const attempts = (state.failed_attempts || 0) + 1;
      const updateBody = { failed_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updateBody.locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
        updateBody.failed_attempts = 0;
      }
      await patchState(updateBody);
      return res.status(401).json({ error: "Incorrect password" });
    }

    await patchState({ failed_attempts: 0, locked_until: null });

    const token = signAdminToken();
    res.setHeader(
      "Set-Cookie",
      `admin_session=${token}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=259200`
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
