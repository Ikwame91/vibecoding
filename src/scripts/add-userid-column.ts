import Database from "better-sqlite3";
import { DB_PATH } from "../config.js";

console.log("DB_PATH:", DB_PATH);
const db = new Database(DB_PATH);

const info = db.prepare("PRAGMA table_info(transactions)").all() as any[];
const hasUserId = info.some((c) => c.name === "userId");

if (info.length === 0) {
  console.log(
    "transactions table does not exist. Run the app or migration first.",
  );
  db.close();
  process.exit(0);
}

if (!hasUserId) {
  console.log("Adding userId column...");
  db.exec("ALTER TABLE transactions ADD COLUMN userId TEXT DEFAULT 'implicit';");
}

const result = db
  .prepare("UPDATE transactions SET userId = ? WHERE userId IS NULL OR userId = ''")
  .run("implicit");

console.log(`Backfilled ${result.changes} row(s) to userId = 'implicit'`);

db.close();
