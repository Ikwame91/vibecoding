import type { Request, Response, NextFunction } from "express";
import { AppError } from "../services/errors.js";
import { verifyAccessToken } from "../services/auth.js";
import { tokenBlacklist } from "../services/token-blacklist.js";
import jwt from "jsonwebtoken";

export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = verifyAccessToken(token!);

    if (tokenBlacklist.has(payload.jti)) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    req.user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
