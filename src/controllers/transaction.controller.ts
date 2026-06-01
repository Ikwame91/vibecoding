import { Request, Response, NextFunction } from "express";
import { tracker } from "../tracker-instance.js";
import { TransactionFilters } from "../models/transaction.js";
import { AppError } from "../services/errors.js";

export function list(req: Request, res: Response, next: NextFunction) {
  try {
    const filters: TransactionFilters = {};
    if (req.query.category !== undefined)
      filters.category = String(req.query.category);
    if (req.query.type !== undefined) {
      const type = String(req.query.type);
      if (type !== "income" && type !== "expense") {
        throw new AppError("Type must be 'income' or 'expense'", 400);
      }
      filters.type = type;
    }
    const userId = (req as any).user?.id || "implicit";
    res.json(tracker.listTransactions(filters, userId));
  } catch (error) {
    return next(error);
  }
}

export function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || "implicit";
    const created = tracker.addTransaction(req.body, userId);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export function getbyId(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || "implicit";
    const id = req.params.id as string;
    const transaction = tracker.getTransactionById(id, userId);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
}

export function balance(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || "implicit";
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
    const userId = (req as any).user?.id || "implicit";
    res.json(tracker.getReportByCategory(userId));
  } catch (error) {
    next(error);
  }
}

export function totalIncome(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ totalIncome: tracker.getTotalIncome() });
  } catch (error) {
    next(error);
  }
}

export function totalExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ totalExpenses: tracker.getTotalExpenses() });
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
    res.json(tracker.getTransactionCountPerCategory());
  } catch (error) {
    next(error);
  }
}

export function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || "implicit";
    const id = req.params.id as string;
    const updated = tracker.updateTransaction(id, req.body, userId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id || "implicit";
    const id = req.params.id as string;
    tracker.deleteTransaction(id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
