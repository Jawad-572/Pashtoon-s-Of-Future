const crypto = require("crypto");

function verifyToken(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/batch1_session=([^;]+)/);
  if (!match) return null;

  const token = match[1];
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");

  if (sig !== expectedSig) return null;

  const decoded = Buffer.from(payload, "base64").toString("utf8");
  const [email, expiresStr] = decoded.split("|");
  const expires = Number(expiresStr);

  if (!email || !expires || Date.now() > expires) return null;

  return email;
}

module.exports = { verifyToken };
