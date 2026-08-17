const crypto = require("crypto");

// Avoids ambiguous characters (0/O, 1/l/I) so passwords are easy to read/type
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 8) {
  const bytes = crypto.randomBytes(length);
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += CHARS[bytes[i] % CHARS.length];
  }
  return pw;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(check, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generatePassword, hashPassword, verifyPassword };
