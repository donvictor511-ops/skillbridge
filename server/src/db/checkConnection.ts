import { prisma } from "./prisma";

interface PingRow {
  ok: number;
}

async function main(): Promise<void> {
  const rows = await prisma.$queryRaw<PingRow[]>`SELECT 1 AS ok`;
  console.log("Database connection OK:", rows);
}

main()
  .catch((error: unknown) => {
    console.error("Database connection FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
