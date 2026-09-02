// src/index.ts
var BASE36_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
var BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
async function generateBase36Hash(data = "", length = 8) {
  return generateBaseNHash(BASE36_CHARS, data, length);
}
function generateBase36Random(length = 8) {
  return generateBaseNRandom(BASE36_CHARS, length);
}
async function generateBase62Hash(data = "", length = 8) {
  return generateBaseNHash(BASE62_CHARS, data, length);
}
function generateBase62Random(length = 8) {
  return generateBaseNRandom(BASE62_CHARS, length);
}
async function generateBaseNHash(chars, data, length) {
  if (crypto.subtle === void 0) {
    return generateBaseNRandom(chars, length);
  }
  if (typeof data !== "string" && !Buffer.isBuffer(data)) {
    console.warn("Invalid data. Fallback: empty string.");
    data = "";
  }
  if (Number.isNaN(length) || length < 1 || length > 64) {
    console.warn("Invalid length. Fallback: 8.");
    length = 8;
  }
  let result = "";
  let n = BigInt(`0x${await sha256(data)}`);
  const base = BigInt(chars.length);
  while (result.length < length) {
    result = chars[Number(n % base)] + result;
    n /= base;
  }
  return result;
}
function generateBaseNRandom(chars, length) {
  if (Number.isNaN(length) || length < 1 || length > 64) {
    console.warn("Invalid length. Fallback: 8.");
    length = 8;
  }
  let result = "";
  const randoms = crypto.getRandomValues(new Uint8Array(length));
  const base = chars.length;
  for (let i = 0; i < length; i++) {
    result += chars[(randoms[i] ?? 0) % base];
  }
  return result;
}
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = typeof text === "string" ? encoder.encode(text) : new Uint8Array(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
/**
 * BaseN
 *
 * @version 1.0.2
 * @author Yusuke Kamiyamane
 * @license MIT
 * @copyright Copyright (c) Yusuke Kamiyamane
 * @see {@link https://github.com/y14e/basen-ts}
 */

export { generateBase36Hash, generateBase36Random, generateBase62Hash, generateBase62Random };
