import { Request, Response, NextFunction } from "express";
import { tracker } from "../tracker-instance.js";
import { TransactionFilters } from "../models/transaction.js";
import { AppError } from "../services/errors.js";

function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }
  return req.user.id;
}

export function list(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const filters: TransactionFilters = {};
    if (req.query.category !== undefined)
      filters.category = String(req.query.category).trim().toLowerCase();
    if (req.query.type !== undefined) {
      const type = String(req.query.type);
      if (type !== "income" && type !== "expense") {
        throw new AppError("Type must be 'income' or 'expense'", 400);
      }
      filters.type = type;
    }
    if (req.query.from !== undefined) {
      const from = new Date(String(req.query.from));
      if (Number.isNaN(from.getTime())) {
        throw new AppError("Invalid 'from' date", 400);
      }
      filters.from = from;
    }
    if (req.query.to !== undefined) {
      const to = new Date(String(req.query.to));
      if (Number.isNaN(to.getTime())) {
        throw new AppError("To date must be a valid date", 400);
      }
      to.setHours(23, 59, 59, 999);
      filters.to = to;
    }
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new AppError("From date cannot be after to date", 400);
    }

    res.json(tracker.listTransactions(filters, userId));
  } catch (error) {
    return next(error);
  }
}

export function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const created = tracker.addTransaction(req.body, userId);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export function getbyId(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    const transaction = tracker.getTransactionById(id, userId);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
}

export function balance(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    res.json({ balance: tracker.getBalance(userId) });
  } catch (error) {
    next(error);
  }
}

export function reportByCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    res.json(tracker.getReportByCategory(userId));
  } catch (error) {
    next(error);
  }
}

export function totalIncome(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    res.json({ totalIncome: tracker.getTotalIncome(userId) });
  } catch (error) {
    next(error);
  }
}

export function totalExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    res.json({ totalExpenses: tracker.getTotalExpenses(userId) });
  } catch (error) {
    next(error);
  }
}

export function countPerCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = getUserId(req);
    res.json(tracker.getTransactionCountPerCategory(userId));
  } catch (error) {
    next(error);
  }
}

export function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    const updated = tracker.updateTransaction(id, req.body, userId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    const id = req.params.id as string;
    tracker.deleteTransaction(id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
