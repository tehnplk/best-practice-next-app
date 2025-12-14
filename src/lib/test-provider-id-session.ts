import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

export const TEST_PROVIDER_ID_COOKIE_NAME = "test_provider_id_profile";

function getKey(): Buffer {
  const raw =
    process.env.TEST_PROVIDER_ID_SESSION_SECRET ??
    process.env.PROVIDER_CLIENT_SECRET ??
    "";

  if (!raw) {
    throw new Error("Missing TEST_PROVIDER_ID_SESSION_SECRET");
  }

  return createHash("sha256").update(raw).digest();
}

export function sealProviderProfile(profile: unknown): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const plaintext = JSON.stringify(profile ?? null);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const ivB64 = iv.toString("base64url");
  const tagB64 = tag.toString("base64url");
  const ctB64 = ciphertext.toString("base64url");

  return `${ivB64}.${tagB64}.${ctB64}`;
}

export function unsealProviderProfile(value: string): unknown {
  const key = getKey();

  const parts = value.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid sealed payload");
  }

  const [ivB64, tagB64, ctB64] = parts;

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(ctB64, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext);
}
