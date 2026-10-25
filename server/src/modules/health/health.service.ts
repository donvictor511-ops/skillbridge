import { prisma } from "../../db/prisma";

// Throws an error if PostgreSQL cannot be reached.
// The controller decides how to turn that error into an HTTP response.
export async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
