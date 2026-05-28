import Database from 'better-sqlite3';
import type { Transaction } from '../models/transaction.js'
import type { TransactionRepository } from './transactionRepository.js'


const DB_PATH = process.env.TRANSACTIONS_DB_PATH || "data/transactions.db";

export class SqliteTransactionRepository implements TransactionRepository {
    private db: Database.Database

    constructor(dbPath = DB_PATH) {
        this.db = new Database(dbPath);
        this.ensureSchema();
    }

    private ensureSchema() {
        this.db.exec(`
             CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        date TEXT NOT NULL
      );

        `)
    }
    loadAll(): Transaction[] {
        const rows = this.db.prepare("SELECT id, description, amount, type, category, date FROM transactions").all();
        return rows.map((r: any) => ({
            id: r.id,
            description: r.description,
            amount: r.amount,
            type: r.type,
            category: r.category,
            date: new Date(r.date),
        }));
    }

    saveAll(transactions:Transaction[]):  { }
}