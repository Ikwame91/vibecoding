import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../services/errors.js";

export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = auth.split(" ")[1];
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "JWT secret not configured" });
  }
  try {
    const payload = jwt.verify(token!, JWT_SECRET) as { sub?: string };
    const userId = payload.sub;

    if (!userId) {
      throw new AppError("Invalid token", 401);
    }

    req.user = { id: String(userId) };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
