import type { Transaction } from "../models/transaction.js";
import type { TransactionRepository } from "./transactionRepository.js";
import db from "../db/database.js";

db.exec(
  `
     CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount      REAL NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category    TEXT NOT NULL,
    date        TEXT NOT NULL,
    userId     TEXT NOT NULL
  );`,
);

function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    description: row.description as string,
    amount: row.amount as number,
    type: row.type as Transaction["type"],
    category: row.category as string,
    date: new Date(row.date as string),
    userId: row.userId as string,
  };
}

const selectAll = db.prepare(
  "SELECT id, description, amount,type,category,  date, userId FROM transactions ORDER BY date DESC",
);

const insertOrReplace = db.prepare(
  `
  INSERT OR REPLACE INTO transactions(id, description, amount, type, category,date, userId)
  VALUES (@id, @description ,@amount ,@type, @category, @date, @userId)
  `,
);

const deleteAll = db.prepare("DELETE FROM transactions");

export class SqliteTransactionRepository implements TransactionRepository {
  loadAll(): Transaction[] {
    const rows = selectAll.all() as Record<string, unknown>[];
    return rows.map(rowToTransaction);
  }

  saveAll(transactions: Transaction[]): void {
    const persist = db.transaction((items: Transaction[]) => {
      deleteAll.run();

      for (const t of items) {
        insertOrReplace.run({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: t.date.toISOString(),
          userId: t.userId,
        });
      }
    });
    persist(transactions);
  }
}
