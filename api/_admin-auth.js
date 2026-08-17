const crypto = require("crypto");

function signAdminToken() {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 3; // 3 days
  const payload = Buffer.from(`admin|${expires}`).toString("base64");
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifyAdminToken(cookieHeader) {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  if (!match) return false;

  const token = match[1];
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expectedSig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");
  if (sig !== expectedSig) return false;

  const decoded = Buffer.from(payload, "base64").toString("utf8");
  const [tag, expiresStr] = decoded.split("|");
  const expires = Number(expiresStr);

  if (tag !== "admin" || !expires || Date.now() > expires) return false;
  return true;
}

module.exports = { signAdminToken, verifyAdminToken };
