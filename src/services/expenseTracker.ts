import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters,
  UpdateTransactionInput,
} from "../models/transaction.js";
import { randomUUID } from "node:crypto";
import { validateCreateInput, validateUpdateInput } from "./validation.transaction.js";
import { AppError } from "./errors.js";
import { TransactionRepository } from "../repositories/transactionRepository.js";

export class ExpenseTracker {
  constructor(private readonly repository: TransactionRepository) {}

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
      category: input.category.trim().toLocaleLowerCase(),
      date: new Date(),
      userId,
    };
    this.repository.add(transaction);
    return transaction;
  }

  getTransactionById(id: string, userId = "implicit"): Transaction {
    const transaction = this.repository.getById(id, userId);
    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }
    return transaction;
  }

  deleteTransaction(id: string, userId = "implicit"): boolean {
    const deleted = this.repository.delete(id, userId);
    if (!deleted) throw new AppError("Transaction not found", 404);
    return true;
  }

  updateTransaction(
    id: string,
    input: UpdateTransactionInput,
    userId = "implicit",
  ): Transaction {
    validateUpdateInput(input);

    const existing = this.repository.getById(id, userId);
    if (!existing) throw new AppError("Transaction not found", 404);

    const updates: Partial<Transaction> = {};
    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }
    if (input.amount !== undefined) {
      updates.amount = input.amount;
    }
    if (input.type !== undefined) {
      updates.type = input.type;
    }
    if (input.category !== undefined) {
      updates.category = input.category.trim().toLocaleLowerCase();
    }

    const updated = this.repository.update(id, updates, userId);
    if (!updated) throw new AppError("Transaction not found", 404);
    return updated;
  }

  getTotalIncome(userId = "implicit") {
    return this.repository.getTotalIncome(userId);
  }

  getTotalExpenses(userId = "implicit") {
    return this.repository.getTotalExpenses(userId);
  }

  getBalance(userId = "implicit") {
    return this.repository.getBalance(userId);
  }

  getReportByCategory(userId = "implicit") {
    return this.repository.getReportByCategory(userId);
  }

  listTransactions(
    filters?: TransactionFilters,
    userId = "implicit",
  ): Transaction[] {
    return this.repository.list(filters || {}, userId);
  }

  getTransactionCountPerCategory(userId = "implicit") {
    return this.repository.getTransactionCountPerCategory(userId);
  }
}
