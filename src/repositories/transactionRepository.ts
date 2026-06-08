import type { Transaction, TransactionFilters } from "../models/transaction.js";

export interface TransactionRepository {
  add(transaction: Transaction): void;
  getById(id: string, userId: string): Transaction | null;
  delete(id: string, userId: string): boolean;
  update(id: string, updates: Partial<Transaction>, userId: string): Transaction | null;
  list(filters: TransactionFilters, userId: string): Transaction[];
  getTotalIncome(userId: string): number;
  getTotalExpenses(userId: string): number;
  getBalance(userId: string): number;
  getReportByCategory(userId: string): Record<string, number>;
  getTransactionCountPerCategory(userId: string): Record<string, number>;
}
