import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../services/errors.js";
export function devAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-user-id");
  const userId = header && header.trim() ? header.trim() : "implicit";
  req .user = { id: userId };
  next();
}
