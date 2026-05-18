import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters,
  UpdateTransactionInput,
} from "../models/transaction.js";
import { randomUUID } from "node:crypto";
import { loadTransactions, saveTransactions } from "../utils/storage.js";
import { validateCreateInput, validateInput } from "./validation.js";
import { AppError } from "./errors.js";

export class ExpenseTracker {
  private transactions: Transaction[] = [];
  private persist(): void {
    saveTransactions(this.transactions);
  }

  constructor() {
    this.transactions = loadTransactions();
  }
  addTransaction(input: CreateTransactionInput): Transaction {
    validateCreateInput(input);
    const transaction: Transaction = {
      id: randomUUID(),
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      category: input.category.trim(),
      date: new Date(),
    };
    this.transactions.push(transaction);
    this.persist();
    return transaction;
  }

  getTransactionById(id: string): Transaction {
    const transaction = this.transactions.find((t) => t.id === id);
    if (!transaction) {
      throw new AppError("Transaction not found");
    }
    return transaction;
  }

  deleteTransaction(id: string) {
    //fidn index if -1 throw;splcie;persist(); return true
    const index = this.transactions.findIndex((t) => t.id === id);
    if (index === -1) throw new AppError("Transaction not found ");

    this.transactions.splice(index, 1);
    this.persist();
    return true;
  }

  updateTransaction(id: string, input: UpdateTransactionInput): Transaction {
    validateInput(input);

    // Find index of the transaction
    const index = this.transactions.findIndex((t) => t.id === id);
    if (index === -1) throw new AppError("Transaction not found");

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

  getTotalIncome() {
    return this.transactions.reduce((total, t) => {
      if (t.type === "income") {
        return total + t.amount;
      }
      return total;
    }, 0);
  }

  //array.reduce((accumulator,currentValue)=>{},initialValue)
  getTotalexpenses() {
    return this.transactions.reduce((total, e) => {
      if (e.type === "expense") {
        return total + e.amount;
      }
      return total;
    }, 0);
  }

  getBalance() {
    return this.getTotalIncome() - this.getTotalexpenses();
  }

  getReportByCategory() {
    return this.transactions.reduce(
      (report, t) => {
        report[t.category] =
          (report[t.category] || 0) +
          (t.type === "income" ? t.amount : -t.amount);
        return report;
      },
      {} as Record<string, number>,
    );
  }

  listTransactions(filters?: TransactionFilters): Transaction[] {
    let result = [...this.transactions];

    if (filters?.category) {
      result = result.filter((t) => t.category === filters.category);
    }

    if (filters?.type) {
      result = result.filter((t) => t.type === filters.type);
    }
    if (filters?.from) {
      result = result.filter((t) => t.date >= filters.from!);
    }
    if (filters?.to) {
      result = result.filter((t) => t.date <= filters.to!);
    }
    return result;
  }

  getTransactionCountPerCategory() {
    return this.transactions.reduce(
      (count, c) => {
        count[c.category] = (count[c.category] || 0) + 1;
        return count;
      },
      {} as Record<string, number>,
    );
  }
}
