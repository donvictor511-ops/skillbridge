import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptDeviceToken(token: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Device token encryption key must be 32 bytes.");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptDeviceToken(value: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Device token encryption key must be 32 bytes.");
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = value.split(".");
  if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) {
    throw new Error("Stored device token has an unsupported format.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
