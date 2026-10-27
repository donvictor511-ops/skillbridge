import { argon2id, hash } from "argon2";

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
