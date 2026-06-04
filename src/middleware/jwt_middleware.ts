import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../services/errors.js";

const JWT_SECRET = process.env.JWT_SECRET;

export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = auth.split(" ")[1];
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
    const payload = jwt.verify(token!, JWT_SECRET) as { sub?: string };
    const userId = payload.sub;
    if (!userId) throw new AppError("Invalid token (no sub)", 401);
    (req as any).user = { id: String(userId) };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}