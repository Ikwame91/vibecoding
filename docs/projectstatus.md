# testxpense — Project Status

## Summary

testxpense is an expense-tracker originally built as a CLI and migrated to a REST API. The architecture centralizes business logic in the domain service and keeps persistence swappable so we can migrate storage (JSON → SQLite) and add user scoping and auth in phases.

## Current scope
- Domain service with CRUD, PATCH merge semantics, and reports (balance, by-category, counts).
- Validation and predictable errors via `AppError`.
- Thin presentation: CLI + REST controllers that forward DTOs to the domain.
- Repository abstraction with both JSON and SQLite adapters.
- Migration tooling to import the JSON store into SQLite.
- Phase 2 user scoping (per-user ownership) implemented with a dev auth header (`x-user-id`) and `userId` on transactions.

## Completed

### Phase 0 — Core domain + REST API
- `ExpenseTracker` domain service implemented with validation and partial-update semantics.
- Controllers and routes for list/get/create/patch/delete and report endpoints.
- OpenAPI documentation updated.

### Phase 1 — Persistence refactor (JSON → SQLite)
- `TransactionRepository` interface defined.
- `JsonTransactionRepository` and `SqliteTransactionRepository` implemented.
- Migration script `src/scripts/migrate-json-to-sqlite.ts` to move JSON into SQLite.
- App wiring updated to use repository seam.

### Phase 2 — User scoping (in progress / largely implemented)
- `userId` added to `Transaction` model and persisted in repositories.
- `devAuth` middleware reads `x-user-id` and populates `req.user.id`.
- Migration script to add/backfill `userId` to existing rows exists.
- `ExpenseTracker` updated to accept `userId` for add/list and several other methods; ownership enforcement applied in service for reads and mutations (ensure controller callsites pass `userId`).

## Remaining work (short-term)
- Ensure all controller callsites pass `userId` to the service (create, get, update, delete, reports, totals).
- Add TypeScript definition for `Express.Request.user` to avoid `(req as any)` casts.
- Add automated story tests (H1–H6 and F1–F3) to validate behavior and cross-user isolation.
- Harden migrations and add CI checks for typecheck and tests.

## Next major phase (recommended)
- Phase 3: Implement JWT-based auth (register/login, `jsonwebtoken`, password hashing with `bcrypt`, JWT middleware) and replace `devAuth` with production auth.
- After auth is stable: scaffold a minimal frontend (Phase 4) and prepare Docker deployment and CI.

## How to validate now (manual checks)
1. Typecheck:
```
npx tsc --noEmit
```
2. Run migrations (backup first):
```
cp src/utils/transactions.json src/utils/transactions.json.backup
npx tsx src/scripts/migrate-json-to-sqlite.ts
npx tsx src/scripts/add-userid-column.ts
```
3. Start API:
```
npm run start:api
```
4. Test user scoping via Postman or curl (use header `x-user-id`): create transactions as different users and verify listings and ownership enforcement.

## Files to review
- `src/services/expenseTracker.ts`
- `src/services/validation.ts`
- `src/repositories/transactionRepository.ts`
- `src/repositories/jsonTransactionRepository.ts`
- `src/repositories/sqliteTransactionRepository.ts`
- `src/scripts/migrate-json-to-sqlite.ts`
- `src/scripts/add-userid-column.ts`
- `src/middleware/auth_middleware.ts`
- `src/controllers/transaction.controller.ts`

## Notes
- Do not commit runtime DB files; `.gitignore` includes `data/*.db`.
- Keep secrets out of repository; use environment variables for production JWT secrets and DB paths.

---
Generated on: 2026-06-02
