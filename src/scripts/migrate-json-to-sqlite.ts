import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DB_PATH, JSON_PATH } from "../config.js";

const JSON_PATH_LOCAL = JSON_PATH;
const DB_PATH_LOCAL = DB_PATH;

const BACKUP_PATH = `${JSON_PATH_LOCAL}.backup.${Date.now()}`;
if (!fs.existsSync(JSON_PATH_LOCAL)) {
  console.log("No transactions.json found at:", JSON_PATH_LOCAL);
  console.log(
    "   Nothing to migrate. If this is a fresh project, that's fine.",
  );
  process.exit(0); // exit code 0 = success, nothing went wrong
}

let rawData: unknown;
try {
  rawData = JSON.parse(fs.readFileSync(JSON_PATH_LOCAL, "utf-8"));
} catch (err) {
  console.error("Failed to parse transactions.json — is it valid JSON?");
  console.error(err);
  process.exit(1); // exit code 1 = something went wrong
}

if (!Array.isArray(rawData)) {
  console.error(
    " transactions.json must be an array at the top level. Aborting.",
  );
  process.exit(1);
}

// Type narrowing — we'll validate individual fields per row during migration.
const rows = rawData as Record<string, unknown>[];
console.log(`Found ${rows.length} transaction(s) in JSON file.`);

const dbDir = path.dirname(DB_PATH_LOCAL);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(` Created directory: ${dbDir}`);
}

const db = new Database(DB_PATH_LOCAL);
// Same pragmas as the app — consistency matters.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

db.prepare(`
  INSERT OR IGNORE INTO users (id, email, passwordHash, createdAt)
  VALUES ('implicit', 'implicit@example.com', '', ?)
`).run(new Date().toISOString());

db.exec(
  `
    CREATE TABLE IF NOT EXISTS transactions(
      id          TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount      REAL NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category    TEXT NOT NULL,
      date        TEXT NOT NULL,
      userId      TEXT NOT NULL DEFAULT 'implicit',
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `,
);

console.log(`🗄️  Database ready at: ${DB_PATH_LOCAL}`);

//INSERT OR IGNORE -- If a row with the id already exists, skip it
const insert = db.prepare(`
  INSERT OR IGNORE INTO transactions (id, description, amount, type, category, date, userId)
  VALUES (@id, @description, @amount, @type, @category, @date, @userId)
`);

const migrate = db.transaction((items: Record<string, unknown>[]) => {
  let migrated = 0;
  let skipped = 0;

  for (const t of items) {
    // Basic field validation — skip malformed rows rather than crashing.
    if (
      !t.id ||
      !t.description ||
      t.amount === undefined ||
      !t.type ||
      !t.category
    ) {
      console.warn(" Skipping malformed row (missing required field):", t);
      skipped++;
      continue;
    }
    const rawDate = t.date ? new Date(t.date as string) : new Date();
    const dateStr = isNaN(rawDate.getTime())
      ? new Date().toISOString() // fallback if date is unparseable
      : rawDate.toISOString();

    const result = insert.run({
      id: t.id,
      description: t.description,
      amount: Number(t.amount), // ensure it's a number, not a string
      type: t.type,
      category: t.category,
      date: dateStr,
      userId:
        typeof t.userId === "string" && t.userId.trim()
          ? t.userId.trim()
          : "implicit",
    });

    // result.changes is 1 if the row was inserted, 0 if it was skipped (OR IGNORE).
    if (result.changes === 1) {
      migrated++;
    } else {
      skipped++;
    }
  }
  return { migrated, skipped };
});

const { migrated, skipped } = migrate(rows);

fs.copyFileSync(JSON_PATH_LOCAL, BACKUP_PATH);
console.log("\ Migration complete!");
console.log(`   Migrated : ${migrated} transaction(s)`);
console.log(`   Skipped  : ${skipped} (already existed or malformed)`);
console.log(`   Backup   : ${BACKUP_PATH}`);
console.log(`   Database : ${DB_PATH_LOCAL}`);
console.log(
  "\nNext step: update your tracker-instance.ts to use SqliteTransactionRepository.",
);

db.close();
