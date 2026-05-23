import { Request, Response, NextFunction } from "express";
import { tracker } from "../tracker-instance.js";
import { TransactionFilters } from "../models/transaction.js";

export function list(req: Request, res: Response, next: NextFunction) {
  try {
    const filters: TransactionFilters = {};
    if (req.query.category !== undefined)
      filters.category = String(req.query.category);
    if (req.query.type !== undefined) {
      const type = String(req.query.type);
      if (type !== "income" && type !== "expense") {
        throw new Error("Invalid type filter");
      }
      filters.type = type;
    }
    res.json(tracker.listTransactions(filters));
  } catch (error) {
    return next(error);
  }
}

export function create(req: Request, res: Response, next: NextFunction) {
  try {
    const created = tracker.addTransaction(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export function getbyId(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const transaction = tracker.getTransactionById(id);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
}
