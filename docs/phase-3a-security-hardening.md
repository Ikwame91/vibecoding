# Phase 3A — Security Hardening

## Summary

Auth endpoints (register/login) are now rate-limited, HTTP responses include security headers via Helmet, CORS is restricted to configured origins in production, email validation uses a proper regex, input sizes are bounded, and the implicit fallback to `"implicit"` user has been removed — unauthenticated requests are now rejected with 401.

---

## Changes

### 1. Helmet security headers — `src/app.ts`

**Where:** Line 3 (import), line 8 (middleware)

**Why:** Helmet sets security-related HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc.) that protect against common web attacks like XSS, clickjacking, and MIME sniffing. Without it, the app is vulnerable to these attacks by default.

**Before:**
```ts
const app = express();
app.use(cors());
```

**After:**
```ts
import helmet from "helmet";

const app = express();
app.use(helmet());
```

**Example:** A response now includes `X-Content-Type-Options: nosniff` which prevents the browser from interpreting files as a different MIME type. If an attacker manages to upload a malicious script disguised as an image, the browser will refuse to execute it.

---

### 2. CORS origin restriction — `src/app.ts`

**Where:** Lines 9-18

**Why:** The previous `app.use(cors())` accepted requests from **any origin**. In production, this allows any website to make requests to the API, enabling CSRF-like attacks if credentials are involved.

**Before:**
```ts
app.use(cors());
```

**After:**
```ts
app.use(cors({
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : false
      : "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
}));
```

**Logic table:**

| NODE_ENV | CORS_ORIGIN set | Behavior |
|----------|----------------|----------|
| production | set | Only those origins are allowed (comma-separated). |
| production | not set | `false` — blocks all cross-origin requests (safest default). |
| development | any | `"*"` — all origins allowed for local dev. |

**Example `.env` entry:**
```
CORS_ORIGIN=http://localhost:5173,https://myapp.com
```

**Note:** The `express.json({ limit: "10kb" })` on line 20 limits request body size, preventing large payload attacks.

---

### 3. Rate limiting on auth routes — `src/routes/auth.routes.ts`

**Where:** Entire file

**Why:** Login and register endpoints are public and can be called without authentication. Without rate limiting, an attacker can brute-force passwords or flood the register endpoint with fake accounts. Adding a rate limiter restricts each IP to 20 requests per 15-minute window.

**Before:**
```ts
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const router = Router();
router.post("/register", authController.register);
router.post("/login", authController.login);
export default router;
```

**After:**
```ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                     // 20 attempts per window
  standardHeaders: true,       // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

router.use(authLimiter);

router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;
```

**Example scenario:** An attacker sends 100 login attempts in one minute from the same IP. After attempt 20, all subsequent requests return `429 Too Many Requests` with `{ "error": "Too many requests. Try again later." }` for the rest of the 15-minute window.

---

### 4. Email validation with regex — `src/services/validation.auth.ts`

**Where:** Lines 1-12

**Why:** The previous check only verified that the string contained `@`. This allowed `"@"`, `"a@b"`, and other clearly invalid emails. The new regex enforces a more realistic shape: local part + `@` + domain + `.` + TLD.

**Before:**
```ts
if (!email.includes("@")) {
  throw new AppError("Email must be valid", 400);
}
```

**After:**
```ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!EMAIL_REGEX.test(email.trim())) {
  throw new AppError("Email must be valid", 400);
}
```

**Examples:**

| Input | Before | After |
|-------|--------|-------|
| `"test@example.com"` | ✅ passes | ✅ passes |
| `"@"` | ✅ passes | ❌ rejected |
| `"user@host"` | ✅ passes | ❌ rejected (no TLD) |
| `""` | ❌ rejected | ❌ rejected |

---

### 5. Input size limits — `src/services/validation.transaction.ts`

**Where:** Lines 2, 7-10

**Why:** Description and category fields had no maximum length. An attacker could send a 10MB string as a description, consuming memory and slowing down the system. The new limit caps fields at 500 characters.

**Before:**
```ts
export function assertNonEmpty(value: string, fieldName: string) {
  if (!value || value.trim() === "") {
    throw new AppError(`${fieldName} cannot be empty`);
  }
}
```

**After:**
```ts
const MAX_FIELD_LENGTH = 500;

export function assertNonEmpty(value: string, fieldName: string) {
  if (!value || value.trim() === "") {
    throw new AppError(`${fieldName} cannot be empty`);
  }
  if (value.trim().length > MAX_FIELD_LENGTH) {
    throw new AppError(`${fieldName} must be at most ${MAX_FIELD_LENGTH} characters`);
  }
}
```

**Example scenario:** A POST request with `{ "description": "A".repeat(10000), "amount": 10, "type": "expense", "category": "test" }` will now be rejected with `400 Bad Request` and `"Description must be at most 500 characters"`.

---

### 6. No more implicit user — `src/controllers/transaction.controller.ts`, `src/middleware/auth_middleware.ts`

**Where:** `transaction.controller.ts` (all methods), `auth_middleware.ts` (entire file)

**Why:** Previously, if no user was attached to the request, controllers fell back to `"implicit"`. This meant that a missing or invalid auth header silently assigned data to a shared default user rather than rejecting the request. Now, both dev and JWT auth paths always set `req.user`, and if it's missing, a 401 is returned.

**Before (`auth_middleware.ts`):**
```ts
const userId = header && header.trim() ? header.trim() : "implicit";
req.user = { id: userId };
```

**After (`auth_middleware.ts`):**
```ts
if (!header || !header.trim()) {
  throw new AppError("x-user-id header is required in development mode", 401);
}
req.user = { id: header.trim() };
```

**Before (controllers — example `create`):**
```ts
const userId = (req as any).user?.id || "implicit";
```

**After (controllers):**
```ts
function getUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }
  return req.user.id;
}
```

**Behavior comparison:**

| Scenario | Before | After |
|----------|--------|-------|
| Request with valid auth | Works as expected | Works as expected |
| Request with missing auth header | Data assigned to `"implicit"` user (shared default) | Returns `401 Authentication required` |
| Request with invalid JWT | Returns `401 Invalid token` | Same (unchanged) |

---

### 7. `toLocaleLowerCase()` replaced with `toLowerCase()` — `src/controllers/transaction.controller.ts`, `src/services/expenseTracker.ts`

**Where:** `transaction.controller.ts:10`, `expenseTracker.ts:25,68`

**Why:** `String.prototype.toLocaleLowerCase()` is locale-sensitive. In Turkish, for example, `'I'.toLocaleLowerCase('tr')` returns `'ı'` (dotless i), which would cause category mismatches between different environments. `.toLowerCase()` uses the invariant Unicode locale and is always consistent.

**Example:**
```ts
// Problem:
'Istanbul'.toLocaleLowerCase('tr')  // "ıstanbul" (wrong category match)
'Istanbul'.toLowerCase()             // "istanbul" (correct)
```

---

### 8. Type augmentation fix — `src/types/express.d.ts`

**Where:** Entire file

**Why:** The previous file imported `Request` from express at the top level, which turned the file into a module and prevented `declare global` from working. The controllers resorted to `(req as any)` casts. The fix removes the import and adds `export {}` to make the file a module while keeping the global augmentation valid.

---

## Configuration

Add to your `.env` for production:
```
CORS_ORIGIN=http://localhost:5173,https://your-frontend.com
```

## Upgrade notes

- `express-rate-limit` v8.x is **ESM-only**. If you ever switch to CommonJS, downgrade to v6.x.
- The `implicit` user fallback is gone. All API requests **must** include either:
  - `Authorization: Bearer <token>` (production) or
  - `x-user-id: <id>` (development)
- The `@types/express-rate-limit` package was installed as a devDependency. If you get type errors, check that `express-rate-limit` v8+ doesn't need its own types — it ships its own.

## Files modified

| File | Change |
|------|--------|
| `src/app.ts` | Added Helmet, restricted CORS, added JSON body size limit |
| `src/routes/auth.routes.ts` | Added rate limiter middleware |
| `src/services/validation.auth.ts` | Added proper email regex |
| `src/services/validation.transaction.ts` | Added max-length check on description/category |
| `src/services/expenseTracker.ts` | `toLocaleLowerCase()` → `toLowerCase()` |
| `src/controllers/transaction.controller.ts` | Removed `(req as any)` casts and implicit fallback; added `getUserId()` helper |
| `src/middleware/auth_middle.ts` | Removed unused `jwt` import; removed implicit fallback; requires header |
| `src/types/express.d.ts` | Fixed global type augmentation |
| `.env.example` | Added `CORS_ORIGIN` and updated docs |

## New dependencies

- `express-rate-limit` — request rate limiting
- `helmet` — security headers

## Why this matters — engineering value of security hardening

Security hardening is often treated as "plumbing work" that gets deprioritized. That is a mistake. Here is why each change in this phase is essential to real backend engineering — and what breaks without it.

### Rate limiting prevents automated abuse

Without rate limiting, login endpoints are vulnerable to brute-force attacks. An attacker can try thousands of passwords per minute. With it, the same IP gets 20 attempts per 15 minutes — effectively useless for brute force. This is why every major platform (Google, GitHub, Twitter) rate-limits auth endpoints. Without it:

- **Banking apps:** Attacker guesses weak passwords by volume
- **E-commerce:** Bots create thousands of fake accounts
- **Social media:** Credential stuffing from leaked password databases

One rate limiter middleware blocks all of these at once.

### Security headers protect against browser-level attacks

Helmet sets headers like `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. Without these:

- **XSS:** An attacker uploads a `.html` file that your API serves. Without `X-Content-Type-Options`, the browser may execute it as HTML instead of treating it as a download.
- **Clickjacking:** Another website embeds your app in an invisible iframe and tricks users into clicking buttons.
- **MIME sniffing:** Old browsers try to "guess" the content type of a response, potentially executing a text file as JavaScript.

These headers cost nothing to set and prevent entire categories of attacks.

### CORS restrictions prevent data theft

Without CORS restrictions, any website can make authenticated requests to your API if a user is logged in. Example attack:

```
1. User visits attacker.com while logged into your app
2. attacker.com makes fetch() calls to your API
3. Browser attaches cookies/auth headers automatically
4. Attacker reads the user's private data
```

With CORS restricted to known origins, only your frontend domain can make browser requests. This is why production APIs never use `app.use(cors())` without origin configuration.

### Input validation prevents resource exhaustion

Without size limits on description/category, an attacker can:
- Send a 10MB string as a "description", consuming server memory
- Fill your database with garbage data
- Slow down queries that process large text fields

A 500-character limit prevents all of this while being more than enough for real users (the Constitution is ~4,500 words; 500 characters covers ~80 words).

### No implicit fallback prevents data leaks

The old `|| "implicit"` fallback meant that a missing auth header silently assigned data to a shared default user. In practice:

- A buggy frontend sends requests without auth headers
- All those requests write to the same `"implicit"` user
- User A's data mingles with User B's data
- Reports, balances, and history are corrupted for everyone

A 401 on missing auth is the only correct behavior. "Guess the user" is never the right answer in production.

### Summary

Every item in Phase 3A protects against a specific, well-documented attack class. None of them are theoretical — they map directly to CVEs, data breaches, and OWASP Top 10 vulnerabilities. In any professional backend role, these patterns are expected, not optional.
