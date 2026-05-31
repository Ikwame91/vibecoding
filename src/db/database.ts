import Database from "better-sqlite3";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import fs from "node:fs";
import { DB_PATH, DATA_DIR } from "../config.js";

const dbDir = DATA_DIR;

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Use the type alias here
const db: BetterSqlite3Database = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;
