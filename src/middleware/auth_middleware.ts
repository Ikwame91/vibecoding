import type { Request, Response, NextFunction } from "express";
import { AppError } from "../services/errors.js";

export function devAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-user-id");
  if (!header || !header.trim()) {
    throw new AppError("x-user-id header is required in development mode", 401);
  }
  req.user = { id: header.trim() };
  next();
}
