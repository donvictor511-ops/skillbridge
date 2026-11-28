import assert from "node:assert/strict";
import test from "node:test";
import { decryptDeviceToken, encryptDeviceToken, hashDeviceToken } from "./deviceTokenCrypto";

const key = Buffer.alloc(32, 17);
const token = "opaque-fcm-token-value";

test("device token encryption is authenticated, randomized, and reversible", () => {
  const first = encryptDeviceToken(token, key);
  const second = encryptDeviceToken(token, key);
  assert.notEqual(first, second);
  assert.equal(decryptDeviceToken(first, key), token);
  assert.throws(() => decryptDeviceToken(first, Buffer.alloc(32, 18)));
});

test("device token hashes are stable for unique indexing without storing plaintext", () => {
  assert.equal(hashDeviceToken(token), hashDeviceToken(token));
  assert.notEqual(hashDeviceToken(token), token);
});

test("tampered encrypted tokens fail authentication", () => {
  const encrypted = encryptDeviceToken(token, key);
  const pieces = encrypted.split(".");
  pieces[3] = `${pieces[3]}x`;
  assert.throws(() => decryptDeviceToken(pieces.join("."), key));
});
