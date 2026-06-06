import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await authService.register(email, password);
    res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await authService.verifyCredentials(email, password);
    const token = authService.signToken(user.id);//why do i get an error without .id here?
    res.json({ accessToken: token, tokenType: "Bearer", expiresIn: 15 * 60 });
  } catch (err) {
    next(err);
  }
}