import type {
  CreateTransactionInput,
  TransactionType,
  UpdateTransactionInput,
} from "../models/transaction.js";
import { AppError } from "./errors.js";

//initialize Transaction

export function assertValidAmount(amount: number) {
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    throw new AppError("Amount must be a positive number");
  }
}

const MAX_FIELD_LENGTH = 500;

export function assertNonEmpty(value: string, fieldName: string) {
  if (!value || value.trim() === "") {
    throw new AppError(`${fieldName} cannot be empty`);
  }
  if (value.trim().length > MAX_FIELD_LENGTH) {
    throw new AppError(`${fieldName} must be at most ${MAX_FIELD_LENGTH} characters`);
  }
}

export function assertValidType(type: string) {
  //not income/expense -- throw
  if (type !== "income" && type !== "expense") {
    throw new AppError("Type must be 'income' or 'expense'");
  }
}

export function validateCreateInput(input: CreateTransactionInput) {
  assertNonEmpty(input.description, "Description");
  assertValidAmount(input.amount);
  assertValidType(input.type);
  assertNonEmpty(input.category, "Category");
}

export function validateUpdateInput(input: UpdateTransactionInput): void {
  if (
    input.description === undefined &&
    input.amount === undefined &&
    input.type === undefined &&
    input.category === undefined
  ) {
    throw new AppError("At least one field must be provided to update");
  }
  if (input.description !== undefined) {
    assertNonEmpty(input.description, "Description");
  }
  if (input.amount !== undefined) {
    assertValidAmount(input.amount);
  }
  if (input.type !== undefined) {
    assertValidType(input.type);
  }
  if (input.category !== undefined) {
    assertNonEmpty(input.category, "Category");
  }
}
