import type { Request, Response, NextFunction } from "express";

export function devAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-user-id");
  const userId = header && header.trim() ? header.trim() : "implicit";
  (req as any).user = { id: userId };
  next();
}
