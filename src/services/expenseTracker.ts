import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters,
  UpdateTransactionInput,
} from "../models/transaction.js";
import { randomUUID } from "node:crypto";
import { validateCreateInput, validateUpdateInput } from "./validation.js";
import { AppError } from "./errors.js";
import { TransactionRepository } from "../repositories/transactionRepository.js";

export class ExpenseTracker {
  private transactions: Transaction[] = [];

  constructor(private readonly repository: TransactionRepository) {
    this.transactions = this.repository.loadAll();
  }

  private persist() {
    this.repository.saveAll(this.transactions);
  }

  addTransaction(
    input: CreateTransactionInput,
    userId = "implicit",
  ): Transaction {
    validateCreateInput(input);
    const transaction: Transaction = {
      id: randomUUID(),
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      category: input.category.trim(),
      date: new Date(),
      userId,
    };
    this.transactions.push(transaction);
    this.persist();
    return transaction;
  }

  getTransactionById(id: string, userId = "implicit"): Transaction {
    const transaction = this.transactions.find(
      (t) => t.id === id && t.userId === userId,
    );
    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }
    return transaction;
  }

  deleteTransaction(id: string, userId = "implicit"): boolean {
    const index = this.transactions.findIndex(
      (t) => t.id === id && t.userId === userId,
    );
    if (index === -1) throw new AppError("Transaction not found", 404);

    this.transactions.splice(index, 1);
    this.persist();
    return true;
  }

  updateTransaction(
    id: string,
    input: UpdateTransactionInput,
    userId = "implicit",
  ): Transaction {
    validateUpdateInput(input);

    // Find index of the transaction
    const index = this.transactions.findIndex(
      (t) => t.id === id && t.userId === userId,
    );
    if (index === -1) throw new AppError("Transaction not found", 404);

    // Update existing transaction by merging input
    const existing = this.transactions[index]!;
    const updated: Transaction = { ...existing };

    if (input.description !== undefined) {
      updated.description = input.description.trim();
    }
    if (input.amount !== undefined) {
      updated.amount = input.amount;
    }
    if (input.type !== undefined) {
      updated.type = input.type;
    }
    if (input.category !== undefined) {
      updated.category = input.category.trim();
    }

    this.transactions[index] = updated;
    this.persist();
    return updated;
  }

  getTotalIncome(userId = "implicit") {
    return this.transactions.reduce((total, t) => {
      if (t.userId !== userId) return total;
      return t.type === "income" ? total + t.amount : total;
    }, 0);
  }

  getTotalExpenses(userId = "implicit") {
    return this.transactions.reduce((total, e) => {
      if (e.userId !== userId) return total;
      return e.type === "expense" ? total + e.amount : total;
    }, 0);
  }

  getBalance(userId = "implicit") {
    return this.getTotalIncome(userId) - this.getTotalExpenses();
  }

  getReportByCategory(userId = "implicit") {
    return this.transactions.reduce(
      (report, t) => {
        if (t.userId !== userId) return report;
        report[t.category] =
          (report[t.category] || 0) +
          (t.type === "income" ? t.amount : -t.amount);
        return report;
      },
      {} as Record<string, number>,
    );
  }

  listTransactions(
    filters?: TransactionFilters,
    userId = "implicit",
  ): Transaction[] {
    let result = this.transactions.filter((t) => t.userId === userId);

    if (filters?.category)
      result = result.filter((t) => t.category === filters.category);

    if (filters?.type) result = result.filter((t) => t.type === filters.type);

    if (filters?.from) result = result.filter((t) => t.date >= filters.from!);

    if (filters?.to) result = result.filter((t) => t.date <= filters.to!);

    return result;
  }

  getTransactionCountPerCategory(userId = "implicit") {
    return this.transactions.reduce(
      (count, c) => {
        if (c.userId !== userId) return count;
        count[c.category] = (count[c.category] || 0) + 1;
        return count;
      },
      {} as Record<string, number>,
    );
  }
}
