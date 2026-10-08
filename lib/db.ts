import "server-only";

import postgres from "postgres";

const globalForDb = globalThis as unknown as { weddingSql?: postgres.Sql };

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}

function createSql(): postgres.Sql {
  // Prisma's pooler does not support prepared statements.
  return postgres(connectionString(), {
    prepare: false,
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    // CREATE TABLE IF NOT EXISTS reports an existing table as a notice.
    onnotice(notice) {
      if (notice.code === "42P07") return;
      console.log(notice);
    },
  });
}

export const sql = globalForDb.weddingSql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForDb.weddingSql = sql;
}

let schema: Promise<void> | undefined;

/** Creates the guest, reply, and score tables the first time the database is used. */
export function ensureSchema(): Promise<void> {
  schema ??= createSchema().catch((error: unknown) => {
    schema = undefined;
    throw error;
  });
  return schema;
}

async function createSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS households (
      token text PRIMARY KEY,
      service boolean NOT NULL,
      reception boolean NOT NULL,
      party boolean NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS household_people (
      token text NOT NULL REFERENCES households (token) ON DELETE CASCADE,
      position integer NOT NULL,
      name text NOT NULL,
      PRIMARY KEY (token, position)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      token text PRIMARY KEY,
      attending boolean NOT NULL,
      service boolean NOT NULL,
      reception boolean NOT NULL,
      party boolean NOT NULL,
      dietary text NOT NULL,
      message text NOT NULL,
      updated_at timestamptz NOT NULL,
      people text[] NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      token text PRIMARY KEY,
      hits integer NOT NULL,
      updated_at timestamptz NOT NULL,
      recent bigint[] NOT NULL
    )
  `;
}

export async function withDb<T>(task: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  await ensureSchema();
  return sql.begin(task) as Promise<T>;
}
