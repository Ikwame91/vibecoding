import db from "../db/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "./errors.js";
import { randomUUID } from "crypto";
import { assertValidEmail, assertValidPassword } from "./validation.auth.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const JWT_SECRET = process.env.JWT_SECRET;

db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
    )`);
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

  db.prepare(
    "INSERT INTO users(id, email, passwordHash, createdAt) VALUES(?, ?, ?, ?)",
  ).run(id, normalizedEmail, passwordHash, createdAt);

  return { id, email: normalizedEmail, createdAt };
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

export function signToken(userId: string) {
  if (!JWT_SECRET) throw new AppError("JWT secret not configured", 500);
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "15m" });
}
