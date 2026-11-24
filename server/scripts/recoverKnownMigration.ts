import "dotenv/config";
import { spawnSync } from "node:child_process";
import { Client } from "pg";

const migrationName = "20261030070000_add_profile_details";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required to check migration recovery state.");
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    let failedMigrationExists = false;
    try {
      const result = await client.query<{ exists: number }>(
        `SELECT 1 AS exists
         FROM "_prisma_migrations"
         WHERE "migration_name" = $1
           AND "finished_at" IS NULL
           AND "rolled_back_at" IS NULL
         ORDER BY "started_at" DESC
         LIMIT 1`,
        [migrationName],
      );
      failedMigrationExists = result.rowCount === 1;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "42P01"
      ) {
        // Fresh databases do not have Prisma's migration history table yet.
        process.exitCode = 0;
      } else {
        throw error;
      }
    }

    if (failedMigrationExists) {
      console.log(`Recovering the known failed migration ${migrationName}.`);
      const command = process.platform === "win32" ? "npx.cmd" : "npx";
      const recovery = spawnSync(
        command,
        ["prisma", "migrate", "resolve", "--rolled-back", migrationName],
        { cwd: process.cwd(), env: process.env, stdio: "inherit" },
      );

      if (recovery.error) throw recovery.error;
      if (recovery.status !== 0) {
        process.exitCode = recovery.status ?? 1;
      }
    }
  } catch (error) {
    console.error("Could not check migration recovery state.");
    console.error(error instanceof Error ? error.message : "Unknown database error.");
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();
