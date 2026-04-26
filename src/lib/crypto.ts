import { fromBase64Url, toBase64Url } from "./utils";

async function importAesKey(secret: string) {
  const keyBytes = new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptText(secret: string, plainText: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plainText),
  );
  const payload = new Uint8Array(iv.length + encrypted.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encrypted), iv.length);
  return toBase64Url(payload);
}

export async function decryptText(secret: string, cipherText: string) {
  if (!cipherText) {
    return "";
  }

  const payload = fromBase64Url(cipherText);
  const iv = payload.slice(0, 12);
  const data = payload.slice(12);
  const key = await importAesKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
