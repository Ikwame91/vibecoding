import { AppError } from "./errors.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidEmail(email: unknown): asserts email is string {
  if (typeof email !== "string" || email.trim() === "") {
    throw new AppError("Email is required", 400);
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    throw new AppError("Email must be valid", 400);
  }
}

export function assertValidPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.trim() === "") {
    throw new AppError("Password is required", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }
}