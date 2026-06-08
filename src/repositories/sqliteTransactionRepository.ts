import type { Transaction, TransactionFilters } from "../models/transaction.js";
import type { TransactionRepository } from "./transactionRepository.js";
import db from "../db/database.js";

// Ensure table migrations are performed to add the foreign key constraint if not present.
// Note: SQLite ALTER TABLE does not support adding foreign keys directly.
db.transaction(() => {
  // 1. Ensure the users table exists.
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Ensure the 'implicit' user exists so default queries/test cases don't violate the constraint.
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, passwordHash, createdAt)
    VALUES ('implicit', 'implicit@example.com', '', ?)
  `).run(new Date().toISOString());

  // 3. Inspect transactions table schema to see if the foreign key constraint is present.
  const tableInfo = db.prepare("PRAGMA foreign_key_list(transactions)").all();
  const hasUserForeignKey = tableInfo.some((fk: any) => fk.table === "users" && fk.to === "id");

  if (!hasUserForeignKey) {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'").get();
    if (tableExists) {
      // Migrate existing transactions table to new schema
      db.exec("ALTER TABLE transactions RENAME TO transactions_old;");
      db.exec(`
        CREATE TABLE transactions (
          id          TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          amount      REAL NOT NULL,
          type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          category    TEXT NOT NULL,
          date        TEXT NOT NULL,
          userId      TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // Ensure all userIds in existing transactions exist in the users table
      const oldTransactions = db.prepare("SELECT DISTINCT userId FROM transactions_old").all() as { userId: string }[];
      for (const row of oldTransactions) {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, email, passwordHash, createdAt)
          VALUES (?, ?, '', ?)
        `).run(row.userId, `${row.userId}@example.com`, new Date().toISOString());
      }

      // Copy the rows
      db.exec("INSERT INTO transactions (id, description, amount, type, category, date, userId) SELECT id, description, amount, type, category, date, userId FROM transactions_old;");
      db.exec("DROP TABLE transactions_old;");
    } else {
      // Create new transactions table with foreign key constraint
      db.exec(`
        CREATE TABLE transactions (
          id          TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          amount      REAL NOT NULL,
          type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          category    TEXT NOT NULL,
          date        TEXT NOT NULL,
          userId      TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    }
  }
})();

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

export class SqliteTransactionRepository implements TransactionRepository {
  add(transaction: Transaction): void {
    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, category, date, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      transaction.id,
      transaction.description,
      transaction.amount,
      transaction.type,
      transaction.category,
      transaction.date.toISOString(),
      transaction.userId
    );
  }

  getById(id: string, userId: string): Transaction | null {
    const row = db.prepare(
      "SELECT id, description, amount, type, category, date, userId FROM transactions WHERE id = ? AND userId = ?"
    ).get(id, userId) as Record<string, unknown> | undefined;

    return row ? rowToTransaction(row) : null;
  }

  delete(id: string, userId: string): boolean {
    const result = db.prepare(
      "DELETE FROM transactions WHERE id = ? AND userId = ?"
    ).run(id, userId);
    return result.changes > 0;
  }

  update(id: string, updates: Partial<Transaction>, userId: string): Transaction | null {
    const existing = this.getById(id, userId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    db.prepare(`
      UPDATE transactions
      SET description = ?, amount = ?, type = ?, category = ?, date = ?
      WHERE id = ? AND userId = ?
    `).run(
      merged.description,
      merged.amount,
      merged.type,
      merged.category,
      merged.date.toISOString(),
      id,
      userId
    );
    return merged;
  }

  list(filters: TransactionFilters, userId: string): Transaction[] {
    let query = "SELECT id, description, amount, type, category, date, userId FROM transactions WHERE userId = ?";
    const params: any[] = [userId];

    if (filters.category) {
      query += " AND category = ?";
      params.push(filters.category);
    }
    if (filters.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }
    if (filters.from) {
      query += " AND date >= ?";
      params.push(filters.from.toISOString());
    }
    if (filters.to) {
      query += " AND date <= ?";
      params.push(filters.to.toISOString());
    }

    query += " ORDER BY date DESC";

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToTransaction);
  }

  getTotalIncome(userId: string): number {
    const row = db.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE userId = ? AND type = 'income'"
    ).get(userId) as { total: number | null } | undefined;
    return row?.total ?? 0;
  }

  getTotalExpenses(userId: string): number {
    const row = db.prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE userId = ? AND type = 'expense'"
    ).get(userId) as { total: number | null } | undefined;
    return row?.total ?? 0;
  }

  getBalance(userId: string): number {
    const row = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance 
      FROM transactions 
      WHERE userId = ?
    `).get(userId) as { balance: number | null } | undefined;
    return row?.balance ?? 0;
  }

  getReportByCategory(userId: string): Record<string, number> {
    const rows = db.prepare(`
      SELECT 
        category,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total
      FROM transactions
      WHERE userId = ?
      GROUP BY category
    `).all(userId) as { category: string; total: number }[];

    const report: Record<string, number> = {};
    for (const r of rows) {
      report[r.category] = r.total;
    }
    return report;
  }

  getTransactionCountPerCategory(userId: string): Record<string, number> {
    const rows = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM transactions
      WHERE userId = ?
      GROUP BY category
    `).all(userId) as { category: string; count: number }[];

    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.category] = r.count;
    }
    return counts;
  }
}
