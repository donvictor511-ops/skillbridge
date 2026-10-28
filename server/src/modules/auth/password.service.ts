import { argon2id, hash, verify } from "argon2";

// OWASP's minimum for Argon2id is about 19 MiB of memory with 2 passes.
// We use more. Raise these later if your server can handle it.
const ARGON2_MEMORY_KIB = 65_536; // 64 MiB
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 1;

// Returns a single text value that contains the algorithm, its settings,
// a random salt, and the hash. This is what we store in the database.
export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, {
    type: argon2id,
    memoryCost: ARGON2_MEMORY_KIB,
    timeCost: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
  });
}

// Checks a typed password against a stored hash.
// It never throws: a broken or unexpected hash simply means "no match".
export async function verifyPassword(
  storedHash: string,
  plainPassword: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plainPassword);
  } catch {
    return false;
  }
}

// A real hash of a throwaway text. When someone logs in with an email that
// does not exist, we still do one full password check against this hash, so
// the response takes the same time. Without it, response time would reveal
// which emails have accounts.
let dummyHashPromise: Promise<string> | null = null;

export function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("not-a-real-password-used-for-timing");
  return dummyHashPromise;
}
