import fs from 'fs';
import path from 'path';
import type { Transaction } from "../models/transaction.js";

const filePath = path.join(import.meta.dirname, "transactions.json");

export function loadTransactions(): Transaction[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(raw)) return [];
    return raw.map((t: Transaction) => ({
      ...t,
      date: new Date(t.date),
    }));
  } catch {
    console.error("Could not read transactions file, starting fresh.");
    return [];
  }
}
export function saveTransactions(transactions: Transaction[]) {
  fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
}