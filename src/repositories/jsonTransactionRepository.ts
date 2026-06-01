// src/repositories/jsonTransactionRepository.ts
import fs from "fs";
import path from "path";
import type { Transaction } from "../models/transaction.js";
import type { TransactionRepository } from "./transactionRepository.js";
import { JSON_PATH } from "../config.js";

const filePath = JSON_PATH;

export class JsonTransactionRepository implements TransactionRepository {
  loadAll(): Transaction[] {
    if (!fs.existsSync(filePath)) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (!Array.isArray(raw)) return [];
      return raw.map((t: Transaction) => ({
        ...t,
        date: new Date(t.date),
        userId: t.userId ?? "implicit",
      }));
    } catch {
      console.error("Could not read transactions file, starting fresh.");
      return [];
    }
  }

  saveAll(transactions: Transaction[]): void {
    fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2));
  }
}
