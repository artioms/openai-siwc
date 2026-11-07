import keytar from "keytar";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import type { CredentialEncryption } from "@siwc/local";

const SERVICE = "openai-siwc";
const ACCOUNT = "credential-encryption-key";

async function getKey(): Promise<Buffer> {
  let value = await keytar.getPassword(SERVICE, ACCOUNT);

  if (!value) {
    const generated = randomBytes(32).toString("base64");

    await keytar.setPassword(SERVICE, ACCOUNT, generated);

    value = generated;
  }

  return Buffer.from(value, "base64");
}

export const credentialEncryption: CredentialEncryption = {
  id: "openai-siwc-keychain-aes256gcm-v1",

  async isAvailable() {
    try {
      await getKey();
      return true;
    } catch {
      return false;
    }
  },

  async encrypt(plaintext) {
    const key = await getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    return Buffer.concat([
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]);
  },

  async decrypt(ciphertext) {
    const key = await getKey();
    const data = Buffer.from(ciphertext);

    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  },
};

