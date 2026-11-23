import { prisma } from "../src/db/prisma";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3];

async function main(): Promise<void> {
  if (!email || !["admin", "member"].includes(role ?? "")) {
    console.error("Usage: npm run admin:set -- <account-email> admin|member");
    process.exitCode = 2;
  } else {
    try {
      const user = await prisma.user.update({ where: { email }, data: { role: role as "admin" | "member" }, select: { email: true, role: true } });
      console.log(`Updated ${user.email}: role is now ${user.role}.`);
    } catch (error) {
      console.error(error instanceof Error && "code" in error && error.code === "P2025" ? "No account exists with that email." : "Could not update that account role.");
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  }
}

void main();
