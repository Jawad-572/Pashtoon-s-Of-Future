const { verifyAdminToken } = require("./_admin-auth");

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = async (req, res) => {
  if (!verifyAdminToken(req.headers.cookie)) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/batch1_students?select=email,name,whatsapp,payment_ref,approved,added_at&order=added_at.desc`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const rows = await r.json();

    const header = ["Email", "Name", "WhatsApp", "Payment Reference", "Approved", "Registered At"];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push([
        csvEscape(row.email),
        csvEscape(row.name),
        csvEscape(row.whatsapp),
        csvEscape(row.payment_ref),
        csvEscape(row.approved ? "Yes" : "No"),
        csvEscape(row.added_at),
      ].join(","));
    }
    const csv = lines.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="batch2-registrations.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
