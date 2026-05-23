import { Request, Response, NextFunction } from "express";
import { AppError } from "../services/errors.js";
import { tracker } from "../tracker-instance.js";

export function list(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      category: req.query.category as string | undefined,
      type: req.query.type as "income" | "expense" | undefined,
    };
    res.json(tracker.listTransactions());
  } catch (error) {
    next(error);
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
