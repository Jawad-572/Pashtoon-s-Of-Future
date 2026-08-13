module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, whatsapp } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    // Upsert: if this email already registered, update their name/whatsapp
    // but never touch "approved" here — that stays whatever it already was.
    const upsert = await fetch(`${process.env.SUPABASE_URL}/rest/v1/batch1_students`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          email: cleanEmail,
          name: String(name).trim(),
          whatsapp: whatsapp ? String(whatsapp).trim() : null,
        },
      ]),
    });

    if (!upsert.ok) {
      const errText = await upsert.text();
      return res.status(500).json({ error: "Could not save registration", detail: errText });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error, try again" });
  }
};
