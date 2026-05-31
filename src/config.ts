// src/config.ts
import path from "node:path";

export const DATA_DIR = process.env.TESTXPENSE_DATA_DIR || path.join(process.cwd(), "data");
export const DB_PATH = process.env.TESTXPENSE_DB_PATH || path.join(DATA_DIR, "testxpense.db");
export const JSON_PATH = process.env.TESTXPENSE_JSON_PATH || path.join(process.cwd(), "src", "utils", "transactions.json");