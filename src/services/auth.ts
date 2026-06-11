import db from "../db/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { AppError } from "./errors.js";
import { randomUUID } from "crypto";
import { assertValidEmail, assertValidPassword } from "./validation.auth.js";

const parsedSaltRounds = Number(process.env.BCRYPT_ROUNDS);
const SALT_ROUNDS = Number.isInteger(parsedSaltRounds) && parsedSaltRounds > 0 ? parsedSaltRounds : 12;

const ACCESS_TOKEN_EXPIRY = "15m";
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens(
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    tokenHash TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError("JWT secret not configured", 500);
  return secret;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function register(email: unknown, password: unknown) {
  assertValidEmail(email);
  assertValidPassword(password);

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(normalizedEmail);
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  try {
    db.prepare(
      "INSERT INTO users(id, email, passwordHash, createdAt) VALUES(?, ?, ?, ?)",
    ).run(id, normalizedEmail, passwordHash, createdAt);

    return { id, email: normalizedEmail, createdAt };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "SQLITE_CONSTRAINT" || /UNIQUE/i.test(String(e?.message))) {
      throw new AppError("Email already registered", 409);
    }
    throw err;
  }
}

export async function verifyCredentials(email: unknown, password: unknown) {
  assertValidEmail(email);

  if (typeof password !== "string" || password === "") {
    throw new AppError("Invalid email or password", 401);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const row = db
    .prepare("SELECT id, passwordHash FROM users WHERE email = ?")
    .get(normalizedEmail) as { id: string; passwordHash: string } | undefined;

  if (!row) throw new AppError("Invalid email or password", 401);
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) throw new AppError("Invalid email or password", 401);
  return { id: row.id };
}

export function signAccessToken(userId: string): string {
  const secret = getJwtSecret();
  const jti = randomUUID();
  return jwt.sign({ sub: userId, jti }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function getAccessTokenExpirySeconds(): number {
  return ACCESS_TOKEN_EXPIRY_SECONDS;
}

export function generateRefreshToken(userId: string): { token: string; expiresAt: Date } {
  const token = randomUUID() + randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);
  const tokenHash = hashToken(token);

  db.prepare(
    "INSERT INTO refresh_tokens (id, userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), userId, tokenHash, expiresAt.toISOString(), new Date().toISOString());

  return { token, expiresAt };
}

export function rotateRefreshToken(oldToken: string): { accessToken: string; refreshToken: string; expiresAt: Date } | null {
  const tokenHash = hashToken(oldToken);

  const row = db.prepare(
    "SELECT id, userId, expiresAt FROM refresh_tokens WHERE tokenHash = ?"
  ).get(tokenHash) as { id: string; userId: string; expiresAt: string } | undefined;

  if (!row) return null;

  const expiresAt = new Date(row.expiresAt);
  if (expiresAt < new Date()) return null;

  db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(row.id);

  const accessToken = signAccessToken(row.userId);
  const newRefresh = generateRefreshToken(row.userId);
  return { accessToken, refreshToken: newRefresh.token, expiresAt: newRefresh.expiresAt };
}

export function revokeRefreshToken(token: string): void {
  const tokenHash = hashToken(token);
  db.prepare("DELETE FROM refresh_tokens WHERE tokenHash = ?").run(tokenHash);
}

export function verifyAccessToken(token: string): { sub: string; jti: string } {
  const secret = getJwtSecret();
  const payload = jwt.verify(token, secret) as { sub: string; jti: string; exp: number };
  return { sub: payload.sub, jti: payload.jti };
}
