import db from "../db/database.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    jti TEXT PRIMARY KEY,
    expiresAt TEXT NOT NULL
  )
`);

export class TokenBlacklist {
  add(jti: string, expiresAt: Date): void {
    db.prepare(
      "INSERT OR IGNORE INTO blacklisted_tokens (jti, expiresAt) VALUES (?, ?)"
    ).run(jti, expiresAt.toISOString());
  }

  has(jti: string): boolean {
    this.prune();
    const row = db.prepare("SELECT 1 FROM blacklisted_tokens WHERE jti = ?").get(jti);
    return !!row;
  }

  private prune(): void {
    db.prepare("DELETE FROM blacklisted_tokens WHERE expiresAt < ?").run(new Date().toISOString());
  }
}

export const tokenBlacklist = new TokenBlacklist();
