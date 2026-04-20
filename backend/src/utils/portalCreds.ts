import crypto from "crypto";

/**
 * Symmetric envelope encryption for third-party portal credentials.
 * Never persist plaintext. Uses AES-256-GCM with an env-sourced key.
 *
 * Plaintext never leaves the server process; decrypt only in memory
 * when the scraper worker needs to authenticate.
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.PORTAL_CRED_KEY;
  if (!raw) {
    throw new Error(
      "PORTAL_CRED_KEY env var is not set. Generate 32 random bytes and set it in .env."
    );
  }
  // Accept hex, base64, or raw (pad/truncate to 32 bytes)
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
  else if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 44) key = Buffer.from(raw, "base64");
  else key = Buffer.from(raw);
  if (key.length < 32) {
    const padded = Buffer.alloc(32);
    key.copy(padded);
    return padded;
  }
  return key.subarray(0, 32);
}

export type EncryptedCred = {
  ct: string;
  iv: string;
  tag: string;
};

export function encryptCred(plaintext: string): EncryptedCred {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ct: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCred(blob: EncryptedCred): string {
  const iv = Buffer.from(blob.iv, "base64");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(blob.ct, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function hasEncryptedShape(val: unknown): val is EncryptedCred {
  return (
    !!val &&
    typeof val === "object" &&
    typeof (val as any).ct === "string" &&
    typeof (val as any).iv === "string" &&
    typeof (val as any).tag === "string"
  );
}
