import type { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.js";
import { tokenBlacklist } from "../services/token-blacklist.js";
import { AppError } from "../services/errors.js";

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
    const accessToken = authService.signAccessToken(user.id);
    const refresh = authService.generateRefreshToken(user.id);
    res.json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: authService.getAccessTokenExpirySeconds(),
      refreshToken: refresh.token,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== "string") {
      throw new AppError("Refresh token is required", 400);
    }
    const result = authService.rotateRefreshToken(refreshToken);
    if (!result) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
    res.json({
      accessToken: result.accessToken,
      tokenType: "Bearer",
      expiresIn: authService.getAccessTokenExpirySeconds(),
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.header("authorization");
    if (auth && auth.startsWith("Bearer ")) {
      const token = auth.split(" ")[1];
      try {
        const payload = authService.verifyAccessToken(token!);
        tokenBlacklist.add(payload.jti, new Date(Date.now() + 15 * 60 * 1000));
      } catch {
        // Token already invalid — still a successful logout
      }
    }
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === "string") {
      authService.revokeRefreshToken(refreshToken);
    }
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}
