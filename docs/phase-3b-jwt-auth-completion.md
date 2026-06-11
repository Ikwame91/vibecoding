# Phase 3B — JWT Auth Completion

## Summary

Adds logout (token revocation), token refresh with rotation, blacklist checking on every protected request, and consolidates middleware naming. The auth system now supports a full session lifecycle: register → login → access resources → refresh token → logout.

---

## Changes

### 1. Token blacklist — `src/services/token-blacklist.ts`

**Where:** New file

**Why:** JWTs cannot be "expired" before their natural expiry once issued. The blacklist stores revoked token IDs (`jti`) in a SQLite table so the middleware can reject them. Tokens are automatically pruned after their expiry time passes.

```ts
// The blacklist table is created with:
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
  jti TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL
);

// Usage:
tokenBlacklist.add(jti, expiresAt);  // Revoke a token
tokenBlacklist.has(jti);             // Check if revoked
```

**Example scenario:** User logs out. Their access token's `jti` is stored in the blacklist for 15 minutes (its remaining lifespan). Any request using that token is rejected with `401 Token has been revoked`.

---

### 2. JWT includes `jti` (JWT ID) — `src/services/auth.ts`

**Where:** `signAccessToken()` (line ~88)

**Why:** Without a unique `jti`, there's no way to revoke a specific token. Every signed access token now includes a random UUID `jti` claim, which the blacklist uses.

**Before:**
```ts
return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "15m" });
```

**After:**
```ts
const jti = randomUUID();
return jwt.sign({ sub: userId, jti }, jwtSecret, { expiresIn: "15m" });
```

---

### 3. Refresh token system — `src/services/auth.ts`

**Where:** `generateRefreshToken()`, `rotateRefreshToken()`, `revokeRefreshToken()` (lines ~93-131)

**Why:** Access tokens expire in 15 minutes for security. Without refresh tokens, users would need to log in again every 15 minutes. Refresh tokens are long-lived (7 days), stored hashed in the database, and rotated (single-use) on every refresh.

**Flow:**

```
Login
  → returns { accessToken (15m), refreshToken (7d) }

Refresh (POST /auth/refresh)
  → old refresh token is validated & deleted (single-use)
  → new accessToken + new refreshToken are issued

Logout
  → access token jti is blacklisted
  → refresh token is deleted from DB
```

**Refresh token table:**
```sql
CREATE TABLE IF NOT EXISTS refresh_tokens(
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tokenHash TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

The token itself is a double UUID (`randomUUID() + randomUUID()`), stored as a SHA-256 hash. Even if the DB leaks, refresh tokens cannot be forged.

---

### 4. Blacklist check in JWT middleware — `src/middleware/jwt_middleware.ts`

**Where:** Lines 18-20

**Why:** Every protected request must check if the token has been revoked.

**Before:**
```ts
req.user = { id: payload.sub };
next();
```

**After:**
```ts
if (tokenBlacklist.has(payload.jti)) {
  return res.status(401).json({ error: "Token has been revoked" });
}
req.user = { id: payload.sub };
next();
```

---

### 5. New auth endpoints — `src/routes/auth.routes.ts` + `src/controllers/auth.controller.ts`

**Where:** `auth.routes.ts` (lines 20-21), `auth.controller.ts` (lines 36-83)

**Why:** The API needs endpoints for the full auth lifecycle.

**New routes:**
```
POST /auth/refresh   — Body: { refreshToken: "..." }
                       Returns: { accessToken, tokenType, expiresIn, refreshToken }

POST /auth/logout    — Header: Authorization: Bearer <token>
                       Body (optional): { refreshToken: "..." }
                       Returns: { message: "Logged out successfully" }
```

**Refresh endpoint example:**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "..."}'
# → 200 { accessToken, refreshToken, expiresIn }
```

**Logout endpoint example:**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "..."}'
# → 200 { "message": "Logged out successfully" }
```

The logout controller is defensive:
- If the access token is already expired, it still counts as a successful logout
- If no refresh token is provided, only the access token is blacklisted

---

### 6. Renamed middleware — `src/middleware/auth_middleware.ts` → `dev-auth.middleware.ts`

**Where:** File rename, import updated in `app.ts`

**Why:** The old name `auth_middleware.ts` was ambiguous — it only handles dev auth, not JWT auth. The new name `dev-auth.middleware.ts` clearly signals its purpose. The JWT middleware remains `jwt_middleware.ts`.

---

## Login response shape

The login response now includes a `refreshToken`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "uuid-uuid"
}
```

## Files changed/created

| File | Status | Purpose |
|------|--------|---------|
| `src/services/token-blacklist.ts` | **New** | Token revocation/blacklist service |
| `src/services/auth.ts` | Modified | Added `jti`, refresh tokens, `verifyAccessToken` |
| `src/middleware/jwt_middleware.ts` | Modified | Blacklist check on every request |
| `src/middleware/dev-auth.middleware.ts` | **Renamed** | Was `auth_middleware.ts` |
| `src/middleware/auth_middleware.ts` | Deleted | Replaced by `dev-auth.middleware.ts` |
| `src/controllers/auth.controller.ts` | Modified | Added `refresh`, `logout` handlers |
| `src/routes/auth.routes.ts` | Modified | Added `/refresh` and `/logout` routes |
| `src/app.ts` | Modified | Updated import path for dev auth |
| `docs/phase-3b-jwt-auth-completion.md` | **New** | This file |

## Verification

```bash
# Typecheck
npx tsc --noEmit

# Run tests
npm test

# Full auth flow (requires running server with NODE_ENV=production and JWT_SECRET set):
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Login
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Save the accessToken and refreshToken from response

# 3. Access protected resource
curl http://localhost:3000/transactions \
  -H "Authorization: Bearer <accessToken>"

# 4. Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'

# 5. Logout (blacklists access token + deletes refresh token)
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'

# 6. Verify old token is rejected
curl http://localhost:3000/transactions \
  -H "Authorization: Bearer <oldAccessToken>"
# → 401 Token has been revoked
```
