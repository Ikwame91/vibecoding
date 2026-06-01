import Database from "better-sqlite3";
import { DB_PATH } from "../config.js";
import fs from "node:fs";
import path from "node:path";

console.log("DB_PATH:", DB_PATH);
const db = new Database(DB_PATH);

const info = db.prepare("PRAGMA table_info(transactions)").all() as any[];
const hasUserId = info.some((c) => c.name === "userId");

if (!hasUserId) {
  console.log("Adding userId column....");
  db.exec("ALTER TABLE transactions ADD COLUMN userId TEXT;");
  db.prepare(
    "UPDATE transactions SET userId = ? WHERE userId IS NULL OR userId = ''",
  ).run("implicit");
  console.log("Backfilled existing rows to userId = 'implicit'");
} else {
  console.log("userId column already exists; nothing to do.");
}

db.close();
