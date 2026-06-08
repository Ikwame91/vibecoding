// src/repositories/jsonTransactionRepository.ts
import fs from "fs";
import path from "path";
import type { Transaction, TransactionFilters } from "../models/transaction.js";
import type { TransactionRepository } from "./transactionRepository.js";
import { JSON_PATH } from "../config.js";

const filePath = JSON_PATH;

export class JsonTransactionRepository implements TransactionRepository {
  private transactions: Transaction[] = [];

  constructor() {
    this.transactions = this.loadAll();
  }

  private loadAll(): Transaction[] {
    if (!fs.existsSync(filePath)) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (!Array.isArray(raw)) return [];
      return raw.map((t: any) => ({
        ...t,
        date: new Date(t.date),
        userId: t.userId ?? "implicit",
      }));
    } catch {
      console.error("Could not read transactions file, starting fresh.");
      return [];
    }
  }

  private saveAll(): void {
    fs.writeFileSync(filePath, JSON.stringify(this.transactions, null, 2));
  }

  add(transaction: Transaction): void {
    this.transactions.push(transaction);
    this.saveAll();
  }

  getById(id: string, userId: string): Transaction | null {
    return this.transactions.find((t) => t.id === id && t.userId === userId) ?? null;
  }

  delete(id: string, userId: string): boolean {
    const index = this.transactions.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) return false;
    this.transactions.splice(index, 1);
    this.saveAll();
    return true;
  }

  update(id: string, updates: Partial<Transaction>, userId: string): Transaction | null {
    const index = this.transactions.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) return null;
    const updated = { ...this.transactions[index]!, ...updates };
    this.transactions[index] = updated;
    this.saveAll();
    return updated;
  }

  list(filters: TransactionFilters, userId: string): Transaction[] {
    let result = this.transactions.filter((t) => t.userId === userId);
    if (filters.category) result = result.filter((t) => t.category === filters.category);
    if (filters.type) result = result.filter((t) => t.type === filters.type);
    if (filters.from) result = result.filter((t) => t.date >= filters.from!);
    if (filters.to) result = result.filter((t) => t.date <= filters.to!);
    return result;
  }

  getTotalIncome(userId: string): number {
    return this.transactions.reduce((total, t) => {
      if (t.userId !== userId) return total;
      return t.type === "income" ? total + t.amount : total;
    }, 0);
  }

  getTotalExpenses(userId: string): number {
    return this.transactions.reduce((total, t) => {
      if (t.userId !== userId) return total;
      return t.type === "expense" ? total + t.amount : total;
    }, 0);
  }

  getBalance(userId: string): number {
    return this.getTotalIncome(userId) - this.getTotalExpenses(userId);
  }

  getReportByCategory(userId: string): Record<string, number> {
    return this.transactions.reduce((report, t) => {
      if (t.userId !== userId) return report;
      report[t.category] = (report[t.category] || 0) + (t.type === "income" ? t.amount : -t.amount);
      return report;
    }, {} as Record<string, number>);
  }

  getTransactionCountPerCategory(userId: string): Record<string, number> {
    return this.transactions.reduce((count, t) => {
      if (t.userId !== userId) return count;
      count[t.category] = (count[t.category] || 0) + 1;
      return count;
    }, {} as Record<string, number>);
  }
}
