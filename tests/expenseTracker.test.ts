import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Transaction, TransactionFilters } from "../src/models/transaction.js";
import type { TransactionRepository } from "../src/repositories/transactionRepository.js";
import { AppError } from "../src/services/errors.js";
import { ExpenseTracker } from "../src/services/expenseTracker.js";

class FakeTransactionRepository implements TransactionRepository {
  public transactions: Transaction[] = [];

  constructor(initialTransactions: Transaction[] = []) {
    this.transactions = [...initialTransactions];
  }

  get savedTransactions() {
    return this.transactions;
  }

  add(transaction: Transaction): void {
    this.transactions.push(transaction);
  }

  getById(id: string, userId: string): Transaction | null {
    return this.transactions.find((t) => t.id === id && t.userId === userId) ?? null;
  }

  delete(id: string, userId: string): boolean {
    const index = this.transactions.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) return false;
    this.transactions.splice(index, 1);
    return true;
  }

  update(id: string, updates: Partial<Transaction>, userId: string): Transaction | null {
    const index = this.transactions.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) return null;
    const updated = { ...this.transactions[index]!, ...updates };
    this.transactions[index] = updated;
    return updated;
  }

  list(filters: TransactionFilters, userId: string): Transaction[] {
    let result = this.transactions.filter((t) => t.userId === userId);
    if (filters?.category) result = result.filter((t) => t.category === filters.category);
    if (filters?.type) result = result.filter((t) => t.type === filters.type);
    if (filters?.from) result = result.filter((t) => t.date >= filters.from!);
    if (filters?.to) result = result.filter((t) => t.date <= filters.to!);
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

function createTracker(initialTransactions: Transaction[] = []) {
  const repository = new FakeTransactionRepository(initialTransactions);
  const tracker = new ExpenseTracker(repository);

  return { repository, tracker };
}

describe("ExpenseTracker", () => {
  it("adds a transaction, assigns ownership, and persists it", () => {
    const { repository, tracker } = createTracker();

    const created = tracker.addTransaction(
      {
        description: "  Salary  ",
        amount: 1000,
        type: "income",
        category: "  Work  ",
      },
      "user-1",
    );

    assert.equal(created.description, "Salary");
    assert.equal(created.amount, 1000);
    assert.equal(created.type, "income");
    assert.equal(created.category, "work");
    assert.equal(created.userId, "user-1");
    assert.ok(created.id);
    assert.ok(created.date instanceof Date);
    assert.deepEqual(repository.savedTransactions, [created]);
  });

  it("lists only transactions owned by the requested user", () => {
    const { tracker } = createTracker();

    const userOneTransaction = tracker.addTransaction(
      {
        description: "Lunch",
        amount: 20,
        type: "expense",
        category: "food",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Bus",
        amount: 5,
        type: "expense",
        category: "transport",
      },
      "user-2",
    );

    assert.deepEqual(tracker.listTransactions(undefined, "user-1"), [
      userOneTransaction,
    ]);
  });

  it("filters transactions by category and type for a user", () => {
    const { tracker } = createTracker();

    const foodExpense = tracker.addTransaction(
      {
        description: "Lunch",
        amount: 20,
        type: "expense",
        category: "food",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Dinner",
        amount: 35,
        type: "expense",
        category: "food",
      },
      "user-2",
    );
    tracker.addTransaction(
      {
        description: "Salary",
        amount: 900,
        type: "income",
        category: "work",
      },
      "user-1",
    );

    assert.deepEqual(
      tracker.listTransactions({ category: "food", type: "expense" }, "user-1"),
      [foodExpense],
    );
  });

  it("calculates totals, expenses, and balance per user", () => {
    const { tracker } = createTracker();

    tracker.addTransaction(
      {
        description: "Salary",
        amount: 1000,
        type: "income",
        category: "work",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Lunch",
        amount: 25,
        type: "expense",
        category: "food",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Rent",
        amount: 300,
        type: "expense",
        category: "housing",
      },
      "user-2",
    );

    assert.equal(tracker.getTotalIncome("user-1"), 1000);
    assert.equal(tracker.getTotalExpenses("user-1"), 25);
    assert.equal(tracker.getBalance("user-1"), 975);
    assert.equal(tracker.getBalance("user-2"), -300);
  });

  it("builds category reports and counts per user", () => {
    const { tracker } = createTracker();

    tracker.addTransaction(
      {
        description: "Salary",
        amount: 1000,
        type: "income",
        category: "work",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Lunch",
        amount: 20,
        type: "expense",
        category: "food",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Dinner",
        amount: 30,
        type: "expense",
        category: "food",
      },
      "user-1",
    );
    tracker.addTransaction(
      {
        description: "Bonus",
        amount: 500,
        type: "income",
        category: "work",
      },
      "user-2",
    );

    assert.deepEqual(tracker.getReportByCategory("user-1"), {
      work: 1000,
      food: -50,
    });
    assert.deepEqual(tracker.getTransactionCountPerCategory("user-1"), {
      work: 1,
      food: 2,
    });
  });

  it("gets, updates, and deletes transactions only for the owning user", () => {
    const { tracker } = createTracker();

    const created = tracker.addTransaction(
      {
        description: "Lunch",
        amount: 20,
        type: "expense",
        category: "food",
      },
      "user-1",
    );

    assert.equal(tracker.getTransactionById(created.id, "user-1"), created);
    assert.throws(
      () => tracker.getTransactionById(created.id, "user-2"),
      AppError,
    );

    const updated = tracker.updateTransaction(
      created.id,
      {
        amount: 25,
        category: "meals",
      },
      "user-1",
    );

    assert.equal(updated.amount, 25);
    assert.equal(updated.category, "meals");
    assert.equal(updated.description, "Lunch");
    assert.throws(
      () => tracker.updateTransaction(created.id, { amount: 30 }, "user-2"),
      AppError,
    );

    assert.equal(tracker.deleteTransaction(created.id, "user-1"), true);
    assert.throws(
      () => tracker.getTransactionById(created.id, "user-1"),
      AppError,
    );
  });

  it("rejects invalid create inputs", () => {
    const { tracker } = createTracker();

    assert.throws(
      () =>
        tracker.addTransaction({
          description: "",
          amount: 10,
          type: "expense",
          category: "food",
        }),
      /Description cannot be empty/,
    );
    assert.throws(
      () =>
        tracker.addTransaction({
          description: "Lunch",
          amount: "10" as unknown as number,
          type: "expense",
          category: "food",
        }),
      /Amount must be a positive number/,
    );
    assert.throws(
      () =>
        tracker.addTransaction({
          description: "Lunch",
          amount: 10,
          type: "invalid" as "expense",
          category: "food",
        }),
      /Type must be 'income' or 'expense'/,
    );
  });

  it("rejects empty or invalid update inputs", () => {
    const { tracker } = createTracker();
    const created = tracker.addTransaction({
      description: "Lunch",
      amount: 20,
      type: "expense",
      category: "food",
    });

    assert.throws(
      () => tracker.updateTransaction(created.id, {}),
      /At least one field must be provided to update/,
    );
    assert.throws(
      () => tracker.updateTransaction(created.id, { amount: 0 }),
      /Amount must be a positive number/,
    );
    assert.throws(
      () => tracker.updateTransaction(created.id, { category: "   " }),
      /Category cannot be empty/,
    );
  });
});
