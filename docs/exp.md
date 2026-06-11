<!-- [learning-agent.md](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/learning-agent.md:1>) is not part of the running app. It is a **teaching contract** for how I should help you work on this project.

Its main idea is: this project is not only about getting the expense tracker working. It is about making sure you understand **what each part does, why it exists, how it connects, and what can go wrong**.

**What This Project Is**

This is a TypeScript expense tracker app. It currently has two ways to interact with it:

1. A **CLI app** from [index.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/index.ts:1>)
2. An **HTTP API** from [src/server.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/server.ts:1>)

Both use the same core business logic: [ExpenseTracker](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/expenseTracker.ts:12>).

The project lets a user:

- Add income or expense transactions
- List transactions
- Filter by category or type
- Get one transaction by ID
- Update or delete transactions
- Calculate balance
- Get reports like total income, total expenses, and category totals
- Store transactions in SQLite

**Mental Model**

Think of the app like a small shop ledger.

- The **controller** is the cashier taking requests from customers.
- The **service** is the accountant deciding the rules.
- The **repository** is the filing cabinet where records are stored.
- The **database** is the actual drawer holding the papers.
- The **middleware** is the security/check-in desk before the request reaches the cashier.

That separation matters because each part has a focused job.

**Main Execution Flow**

When someone calls the API, the flow is:

```txt
HTTP request
 -> app.ts
 -> devAuth middleware
 -> transaction.routes.ts
 -> transaction.controller.ts
 -> ExpenseTracker service
 -> SqliteTransactionRepository
 -> SQLite database
 -> response back to user
```

For example, `POST /transactions` goes like this:

1. [app.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/app.ts:1>) receives the request.
2. `devAuth` reads `x-user-id` and attaches `req.user`.
3. [transaction.routes.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/routes/transaction.routes.ts:1>) sends it to `transactionController.create`.
4. The controller calls `tracker.addTransaction(...)`.
5. [expenseTracker.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/expenseTracker.ts:23>) validates and creates the transaction.
6. The repository saves it into SQLite.

**Important Files**

[app.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/app.ts:1>) builds the Express app. It adds CORS, JSON parsing, dev auth, routes, 404 handling, and the error handler.

[server.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/server.ts:1>) starts the API server. `app.ts` defines the app; `server.ts` actually listens on a port.

[transaction.controller.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/controllers/transaction.controller.ts:1>) translates HTTP requests into service calls. It should not contain business logic; it should mostly read params/body/query, call the tracker, and return JSON.

[expenseTracker.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/expenseTracker.ts:12>) is the heart of the project. This is where the real rules live: add, update, delete, list, calculate balance, total income, total expenses, reports.

[validation.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/validation.ts:1>) protects the service from bad input. For example, empty descriptions and invalid transaction types should fail before data is saved.

[transactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/transactionRepository.ts:1>) defines the repository contract. It says: any storage system must support `loadAll()` and `saveAll()`.

[sqliteTransactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/sqliteTransactionRepository.ts:1>) is the current real storage layer. It loads from and saves to SQLite.

[jsonTransactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/jsonTransactionRepository.ts:1>) is the older JSON storage option. It still exists, but the active app currently uses SQLite.

[tracker-instance.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/tracker-instance.ts:1>) creates one shared tracker instance. This matters because the API should use one shared service connected to one repository.

[config.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/config.ts:1>) centralizes file paths for the data directory, SQLite DB, and JSON file.

**Important Patterns**

The biggest pattern here is the **repository pattern**.

[WHY THIS WAY]  
The service does not care whether data comes from JSON, SQLite, or something else. It only talks to the `TransactionRepository` interface.

[HOW THIS CONNECTS]  
`ExpenseTracker` depends on `TransactionRepository`, and `SqliteTransactionRepository` implements that contract.

[WHAT COULD GO WRONG]  
Right now the repository saves the whole transaction list by deleting all rows and rewriting them. That is simple for this phase, but not ideal for a larger app because one save operation rewrites everything.

[CONCEPT TO REMEMBER]  
A repository hides storage details from business logic.

**The User System**

This project now has a simple dev user system through [auth_middleware.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/middleware/auth_middleware.ts:1>).

It reads:

```txt
x-user-id
```

If the header exists, that becomes the user. If not, the user becomes:

```txt
implicit
```

So if you call the API without a header, your transactions belong to `"implicit"`.

This is not real production authentication yet. It is a phase-appropriate way to separate user data before adding real login/JWT/auth later.

**The Migration System**

[migrate-json-to-sqlite.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/scripts/migrate-json-to-sqlite.ts:1>) moves old JSON transactions into SQLite.

Since older JSON transactions may not have `userId`, this line is important:

```ts
userId:
  typeof t.userId === "string" && t.userId.trim()
    ? t.userId.trim()
    : "implicit",
```

Meaning:

- If the old transaction already has a real `userId`, keep it.
- If it does not, assign `"implicit"`.

That prevents `NULL` user IDs and keeps old data usable.

**What learning-agent.md Requires From Me**

The file says I should not just throw code at you.

Before code, I should explain:

- What we are building
- Why it is needed
- How it connects to the existing system

After code, I should explain:

- What changed
- Why that approach was used
- What could break if it was done differently

So for this project, every future feature should be taught through the project’s actual files, not abstract examples.

**Current Project Health**

The architecture is solid for this phase:

- API routing is separated from business logic
- Validation is separated from controller code
- Storage is behind a repository
- SQLite is active
- JSON migration is now aligned with `userId`
- User-scoped calculations have been fixed

The next thing I would watch carefully is testing. Right now `npm test` is not real yet, so bugs are found manually. The project is ready for a small test phase: service tests first, then API route tests. -->
----------------------------------------------------------------------------------------------------------------------------------------------------
<!-- Absolutely. Let’s build a strong mental model of the project from the inside out.

The easiest way to understand this app is to see it as layers:

```txt
Client / CLI
   ↓
Routes
   ↓
Controllers
   ↓
ExpenseTracker service
   ↓
Repository
   ↓
Database / JSON file
```

Each layer has a different job. The cleaner those jobs stay, the easier the project is to reason about.

**Big Picture**

This project is an expense tracker. It manages `Transaction` records.

A transaction has things like:

```ts
{
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
  userId: string;
}
```

The app can:

- create transactions
- list transactions
- filter by type or category
- get one transaction
- update a transaction
- delete a transaction
- calculate income, expenses, balance, and category reports
- store data in SQLite

The most important design decision is this:

> The business logic lives in `ExpenseTracker`, while the storage logic lives in repositories.

That means the app does not mix “how to calculate balance” with “how to save data to SQLite.” Good separation.

---

**1. `src/app.ts`**

File: [app.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/app.ts:1>)

This file builds the Express app.

It does not start the server. It only configures the app.

Current flow:

```ts
const app = express();

app.use(cors());
app.use(express.json());
app.use(devAuth);

app.get("/health", ...);

app.use("/transactions", transactionRouter);

app.use(404 handler);
app.use(errorHandler);
```

Meaning:

1. `cors()` allows requests from browsers/frontend clients.
2. `express.json()` allows the API to read JSON bodies.
3. `devAuth` attaches a fake/dev user to every request.
4. `/health` is a simple check that the server is alive.
5. `/transactions` sends transaction-related requests to the transaction router.
6. Unknown routes return 404.
7. Errors go to the centralized error handler.

[HOW THIS CONNECTS]  
Every API request enters through this file first.

[CONCEPT TO REMEMBER]  
This is **application setup**. It wires middleware and routes together.

---

**2. `src/server.ts`**

File: [server.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/server.ts:1>)

This file starts the HTTP server:

```ts
app.listen(PORT, () => {
  console.log(`Api Server running on http://localhost:${PORT}`);
});
```

Important difference:

- `app.ts` defines the app.
- `server.ts` runs the app.

[WHY THIS WAY]  
Separating them makes testing easier later. Tests can import `app` without actually starting a real server.

---

**3. `src/routes/transaction.routes.ts`**

File: [transaction.routes.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/routes/transaction.routes.ts:1>)

Routes decide which controller function handles each URL.

Example:

```ts
router.get("/", transactionController.list);
router.post("/", transactionController.create);
router.get("/balance", transactionController.balance);
router.patch("/:id", transactionController.update);
router.delete("/:id", transactionController.remove);
```

So if a request comes in:

```txt
GET /transactions/balance
```

Express sees:

```ts
router.get("/balance", transactionController.balance);
```

and calls the `balance` controller.

[WHAT COULD GO WRONG]  
Route order matters. This is why `/balance` appears before `/:id`.

If you put this first:

```ts
router.get("/:id", ...)
```

then `/balance` could accidentally be treated as:

```txt
id = "balance"
```

So specific routes should come before dynamic routes.

[CONCEPT TO REMEMBER]  
Routes are the API’s address book.

---

**4. Controllers**

File: [transaction.controller.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/controllers/transaction.controller.ts:1>)

Controllers are the bridge between HTTP and your business logic.

A controller should mostly do four things:

1. Read data from the request
2. Call the service
3. Send the response
4. Pass errors to error middleware

Example:

```ts
export function create(req, res, next) {
  try {
    const userId = (req as any).user?.id || "implicit";
    const created = tracker.addTransaction(req.body, userId);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}
```

In plain English:

- Get the current user ID from the request.
- Pass the request body to `tracker.addTransaction`.
- Return the created transaction as JSON.
- If anything fails, send the error to `errorHandler`.

The controller does **not** decide whether an amount is valid. That is the service/validation layer’s job.

The controller does **not** write to SQLite. That is the repository’s job.

[WHY THIS WAY]  
If controllers contain too much logic, your app becomes hard to test and hard to change. Keeping them thin makes the code easier to follow.

[HOW THIS CONNECTS]  
Routes call controllers. Controllers call `tracker`, which is the shared `ExpenseTracker` instance.

---

**Controller Functions**

`list`

```ts
GET /transactions
```

Reads optional query filters:

```txt
?category=food
?type=expense
```

Then calls:

```ts
tracker.listTransactions(filters, userId)
```

This returns only that user’s transactions.

---

`create`

```ts
POST /transactions
```

Reads `req.body` and creates a transaction.

Expected body:

```json
{
  "description": "Lunch",
  "amount": 20,
  "type": "expense",
  "category": "food"
}
```

---

`getbyId`

```ts
GET /transactions/:id
```

Reads `req.params.id`.

Then calls:

```ts
tracker.getTransactionById(id, userId)
```

Important: it checks both `id` and `userId`, so users cannot read each other’s transactions.

---

`balance`

```ts
GET /transactions/balance
```

Calls:

```ts
tracker.getBalance(userId)
```

Returns:

```json
{
  "balance": 100
}
```

---

`reportByCategory`

```ts
GET /transactions/reports/by-category
```

Calls:

```ts
tracker.getReportByCategory(userId)
```

This groups totals by category.

Example:

```json
{
  "salary": 5000,
  "food": -200,
  "transport": -100
}
```

---

`totalIncome`

```ts
GET /transactions/reports/income
```

Returns total income for the current user.

---

`totalExpenses`

```ts
GET /transactions/reports/expenses
```

Returns total expenses for the current user.

---

`countPerCategory`

```ts
GET /transactions/reports/counts
```

Returns how many transactions exist per category.

Example:

```json
{
  "food": 3,
  "salary": 1
}
```

---

`update`

```ts
PATCH /transactions/:id
```

Updates only the fields provided.

Example:

```json
{
  "amount": 30
}
```

It does not replace the whole transaction. It patches part of it.

---

`remove`

```ts
DELETE /transactions/:id
```

Deletes a transaction and returns status `204`.

`204` means:

> Success, but no response body.

---

**5. `tracker-instance.ts`**

File: [tracker-instance.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/tracker-instance.ts:1>)

This file creates the real tracker used by the app:

```ts
const repository = new SqliteTransactionRepository();
export const tracker = new ExpenseTracker(repository);
```

This is important.

The controller does not create a new tracker every request. It imports the shared one.

[WHY THIS WAY]  
If every request created a new tracker, the app would keep reloading data and behave unpredictably. One shared tracker gives the app one consistent service instance.

[CONCEPT TO REMEMBER]  
This is close to a **singleton-style shared instance**. The project creates one main tracker and reuses it.

---

**6. `ExpenseTracker` Service**

File: [expenseTracker.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/expenseTracker.ts:12>)

This is the heart of the project.

It owns the business rules.

It has:

```ts
private transactions: Transaction[] = [];
```

When the tracker starts:

```ts
constructor(private readonly repository: TransactionRepository) {
  this.transactions = this.repository.loadAll();
}
```

That means:

1. The repository loads saved transactions.
2. The tracker keeps them in memory.
3. Every change updates memory and then persists to storage.

---

**Important Method: `addTransaction`**

```ts
addTransaction(input, userId = "implicit")
```

Flow:

1. Validate the input.
2. Create a new transaction object.
3. Generate an ID.
4. Trim description/category.
5. Add date.
6. Attach `userId`.
7. Push into the transaction array.
8. Save to repository.
9. Return the created transaction.

This is business logic because it defines what a valid transaction looks like.

[WHAT COULD GO WRONG]  
If validation is weak, bad data gets stored. For example, `"10"` as a string amount could break calculations. That is why the `typeof amount !== "number"` fix mattered.

---

**Important Method: `getTransactionById`**

```ts
const transaction = this.transactions.find(
  (t) => t.id === id && t.userId === userId,
);
```

This is not just finding by ID. It is finding by ID **and owner**.

That prevents user A from accessing user B’s transaction.

---

**Important Method: `updateTransaction`**

This method:

1. Validates the update input.
2. Finds the transaction by `id` and `userId`.
3. Copies the existing transaction.
4. Updates only fields that were provided.
5. Saves the result.

This part matters:

```ts
const updated: Transaction = { ...existing };
```

It creates a copy first.

Then:

```ts
if (input.description !== undefined) {
  updated.description = input.description.trim();
}
```

That means blank/missing fields do not overwrite existing values unless actually provided.

[CONCEPT TO REMEMBER]  
This is a **partial update**, often called a PATCH-style update.

---

**Important Method: `getBalance`**

```ts
return this.getTotalIncome(userId) - this.getTotalExpenses(userId);
```

This is now correct because both sides use the same user.

Balance is:

```txt
income - expenses
```

So if a user has:

```txt
income: 1000
expenses: 300
```

balance is:

```txt
700
```

---

**Important Method: `getReportByCategory`**

This returns net totals by category.

For income:

```ts
+ amount
```

For expense:

```ts
- amount
```

So:

```txt
salary income 1000 => salary: 1000
food expense 50   => food: -50
```

[WHY THIS WAY]  
It gives you a financial report, not just raw totals.

---

**7. Validation**

File: [validation.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/validation.ts:1>)

Validation protects the app from bad input.

Main checks:

```ts
assertValidAmount(amount)
assertNonEmpty(description)
assertValidType(type)
assertNonEmpty(category)
```

For create:

```ts
validateCreateInput(input)
```

All required fields must be valid.

For update:

```ts
validateUpdateInput(input)
```

At least one field must be provided, and any provided field must be valid.

[WHY THIS WAY]  
Create and update have different rules.

Create needs everything.

Update only needs the fields being changed.

---

**8. Errors**

File: [errors.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/errors.ts:1>)

`AppError` is a custom error class.

```ts
throw new AppError("Transaction not found", 404);
```

This lets the app distinguish expected user-facing errors from unexpected server bugs.

Example expected errors:

- invalid amount
- invalid type
- transaction not found
- empty description

Unexpected errors might be:

- database failure
- programming bug
- missing table

---

**9. Error Middleware**

File: [error_middleware.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/middleware/error_middleware.ts:1>)

This catches errors from controllers.

If the error is an `AppError`, it returns:

```json
{
  "error": "Transaction not found"
}
```

with the correct status code.

If the request body is invalid JSON, it returns:

```json
{
  "error": "Invalid JSON body"
}
```

Otherwise, it returns:

```json
{
  "error": "Internal server error"
}
```

[CONCEPT TO REMEMBER]  
Centralized error handling keeps controllers clean.

Without this, every controller would need to know how to format every possible error.

---

**10. Auth Middleware**

File: [auth_middleware.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/middleware/auth_middleware.ts:1>)

This is development authentication.

It reads:

```txt
x-user-id
```

If the header is present:

```ts
(req as any).user = { id: userId };
```

If not, it uses:

```ts
"implicit"
```

This means every request always has a user.

[WHY THIS WAY]  
The project can practice user-scoped data before adding real login/authentication.

[WHAT COULD GO WRONG]  
This is not secure for production. Anyone can set any `x-user-id`.

But for this phase, it is useful and simple.

---

**11. Models**

File: [transaction.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/models/transaction.ts:1>)

Models define the shape of your data.

Important types:

```ts
export type TransactionType = "income" | "expense";
```

This means TypeScript knows only two transaction types are allowed.

```ts
export interface Transaction
```

This is the full saved transaction.

```ts
export interface CreateTransactionInput
```

This is what the user sends when creating.

```ts
export interface UpdateTransactionInput
```

This is what the user sends when updating.

```ts
export interface TransactionFilters
```

This is used when listing/filtering transactions.

[CONCEPT TO REMEMBER]  
Types are contracts. They tell the rest of the code what shape data should have.

---

**12. Repositories**

Folder: `src/repositories`

This folder is about persistence.

Persistence means:

> saving data so it still exists after the program stops.

There are three important files.

---

**`transactionRepository.ts`**

File: [transactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/transactionRepository.ts:1>)

This is the interface:

```ts
export interface TransactionRepository {
  loadAll(): Transaction[];
  saveAll(transactions: Transaction[]): void;
}
```

It says:

> Any repository must know how to load all transactions and save all transactions.

This is a contract.

[CONCEPT TO REMEMBER]  
This is the **repository pattern**.

The service does not know whether storage is JSON, SQLite, PostgreSQL, or something else. It only knows the contract.

---

**`jsonTransactionRepository.ts`**

File: [jsonTransactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/jsonTransactionRepository.ts:1>)

This stores transactions in a JSON file.

Important behavior:

```ts
date: new Date(t.date),
userId: t.userId ?? "implicit",
```

JSON cannot store real JavaScript `Date` objects. It stores dates as strings.

So when loading, the repository converts strings back into `Date`.

[WHY THIS MATTERS]  
Without converting back to `Date`, this kind of code could break:

```ts
t.date >= filters.from
```

because string date comparison and Date comparison are not the same thing.

---

**`sqliteTransactionRepository.ts`**

File: [sqliteTransactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/sqliteTransactionRepository.ts:1>)

This is the active repository.

It creates a SQLite table if one does not exist:

```sql
CREATE TABLE IF NOT EXISTS transactions (...)
```

It has:

```ts
rowToTransaction(row)
```

This converts database rows into app `Transaction` objects.

It has:

```ts
loadAll()
```

which reads from SQLite.

It has:

```ts
saveAll(transactions)
```

which deletes existing rows and writes the current in-memory list back.

[WHY THIS WAY]  
For this phase, saving the full list is simple and matches the original JSON-style storage.

[WHAT COULD GO WRONG]  
For a larger app, deleting and rewriting all rows is risky and inefficient. Later, you would likely create repository methods like:

```ts
create(transaction)
update(id, input)
delete(id)
findByUser(userId)
```

But for this phase, `loadAll/saveAll` keeps the repository contract simple.

---

**13. Database Folder**

Folder: `src/db`

File: [database.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/db/database.ts:1>)

This opens the SQLite database:

```ts
const db = new Database(DB_PATH);
```

It also ensures the data directory exists:

```ts
fs.mkdirSync(dbDir, { recursive: true });
```

And sets SQLite pragmas:

```ts
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
```

In simple terms:

- `WAL` helps SQLite handle reads/writes better.
- `foreign_keys = ON` makes SQLite enforce relationships if foreign keys are added later.

[CONCEPT TO REMEMBER]  
This file is the shared database connection.

---

**14. Config**

File: [config.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/config.ts:1>)

This centralizes paths:

```ts
DATA_DIR
DB_PATH
JSON_PATH
```

Instead of hardcoding paths everywhere, other files import from config.

[WHY THIS WAY]  
If you need to change where the DB lives, you change one file or environment variable.

Example:

```bash
TESTXPENSE_DB_PATH=/tmp/test.db npx tsx src/server.ts
```

That lets you run the app with a different database.

---

**15. Scripts**

Folder: `src/scripts`

Scripts are not part of normal request handling. They are maintenance tools.

---

**`migrate-json-to-sqlite.ts`**

This moves old JSON data into SQLite.

It:

1. Reads `transactions.json`
2. Creates the SQLite table
3. Converts old rows
4. Adds missing `userId` as `"implicit"`
5. Inserts rows into SQLite
6. Backs up the JSON file

This is a one-time or occasional migration tool.

---

**`add-userid-column.ts`**

This repairs older SQLite databases that already existed before `userId` was added.

It:

1. Opens the DB
2. Checks if `transactions` table exists
3. Checks if `userId` column exists
4. Adds it if missing
5. Backfills `NULL` user IDs to `"implicit"`

You do not need this for a fresh DB created by the new migration.

---

**16. CLI App**

File: [index.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/index.ts:1>)

This is the terminal version of the app.

It uses `readline` to show a menu:

```txt
1. Add transaction
2. View all transactions
3. View balance
...
```

It calls the same `tracker` as the API.

That means the CLI and API share the same business logic.

[WHY THIS IS GOOD]  
You do not have two separate implementations of “add transaction” or “calculate balance.”

The CLI is just another interface.

---

**Most Important Architecture Lesson**

The project is built around **separation of concerns**.

That means every part has its own job:

```txt
Routes:
Which URL maps to which action?

Controllers:
How do HTTP requests become service calls?

Service:
What are the business rules?

Validation:
What input is allowed?

Repository:
How is data loaded and saved?

Database:
Where is the data physically stored?

Middleware:
What should happen before/after route handling?
```

When a project grows, this separation protects you.

If you later replace SQLite with PostgreSQL, most of the service logic should not need to change.

If you later add real authentication, the service should still mostly work the same.

If you later add a frontend, the API routes/controllers are already ready to serve it.

---

**A Full Example: Creating a Transaction**

Let’s walk through one request.

Request:

```http
POST /transactions
x-user-id: user123
Content-Type: application/json
```

Body:

```json
{
  "description": "Lunch",
  "amount": 25,
  "type": "expense",
  "category": "food"
}
```

Flow:
n } fro
```txt
app.ts
  -> devAuth attaches req.user.id = "user123"
  -> transaction.routes.ts matches POST /
  -> transaction.controller.ts calls create()
  -> create() calls tracker.addTransaction(req.body, "user123")
  -> ExpenseTracker validates input
  -> ExpenseTracker creates full transaction with id/date/userId
  -> ExpenseTracker saves through SqliteTransactionRepository
  -> repository writes to SQLite
  -> controller returns 201 JSON response
```

Response:

```json
{
  "id": "...",
  "description": "Lunch",
  "amount": 25,
  "type": "expense",
  "category": "food",
  "date": "...",
  "userId": "user123"
}
```

That is the whole system working together.

---

**What To Remember Most**

If you only remember one thing, remember this:

> Controllers handle HTTP. ExpenseTracker handles rules. Repositories handle storage.

That sentence is the backbone of the project.

The second thing to remember:

> `userId` must travel through the whole stack.

From:

```txt
devAuth
 -> controller
 -> ExpenseTracker
 -> repository
 -> database
```

If any layer forgets `userId`, data can leak between users or reports can be wrong. That was exactly the kind of bug we found earlier. -->

You’ve moved the project from “expense tracker with storage” into the beginning of a **real backend system**.

Where we left off in [docs/exp.md](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/docs/exp.md:1>), the project was mainly:

```txt
client/CLI -> routes -> controllers -> ExpenseTracker -> repository -> SQLite
```

Now the project is growing into:

```txt
public auth routes
  -> register/login
  -> users table
  -> password hashing
  -> JWT token issuing

protected transaction routes
  -> auth middleware
  -> user-scoped transaction logic
  -> SQLite persistence
```

That is a big architectural step.

**The New Mental Model**

Before, the app was like a personal notebook.

Now it is becoming like a small banking app.

A real user must first prove who they are. Then every transaction must belong to that user. The backend must answer questions like:

```txt
Who is making this request?
Are they allowed to access this data?
Which records belong to them?
What should happen if their token is missing or expired?
```

That is the real-world backend shift: from **data management** to **identity-aware data management**.

**The Main Backend Flow Now**

For auth:

```txt
POST /auth/register
 -> auth.routes.ts
 -> auth.controller.ts
 -> auth service
 -> users table
```

For login:

```txt
POST /auth/login
 -> auth service verifies password
 -> sign JWT token
 -> return accessToken
```

For transactions in production:

```txt
GET /transactions
 -> jwtAuth reads Authorization header
 -> verifies token
 -> attaches req.user.id
 -> transaction controller
 -> ExpenseTracker
 -> SQLite
```

For transactions in development:

```txt
GET /transactions
 -> devAuth reads x-user-id
 -> attaches req.user.id
 -> transaction controller
 -> ExpenseTracker
```

This is important because development and production use different ways of identifying the user, but the rest of the transaction system can stay the same.

That is good backend design.

**Auth Routes**

File: [auth.routes.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/routes/auth.routes.ts:1>)

This file exposes:

```ts
router.post("/register", authController.register);
router.post("/login", authController.login);
```

[WHY THIS WAY]  
Auth routes are separate from transaction routes because login/register are public actions. A user cannot already have a token before registering or logging in.

[HOW THIS CONNECTS]  
`app.ts` mounts this before auth middleware:

```ts
app.use("/auth", authRouter);
```

That means `/auth/register` and `/auth/login` do not require JWT.

[REAL WORLD]  
This mirrors real apps: signup/login pages are public, but dashboard/account data is protected.

**Auth Controller**

File: [auth.controller.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/controllers/auth.controller.ts:1>)

The controller reads request data:

```ts
const { email, password } = req.body;
```

Then delegates:

```ts
authService.register(email, password);
```

or:

```ts
authService.verifyCredentials(email, password);
```

[WHY THIS WAY]  
The controller should not know how password hashing works. It should only translate HTTP input into a service call.

[CONCEPT TO REMEMBER]  
Controllers are translators, not decision-makers.

A controller should think:

```txt
What did the HTTP request send me?
Which service function should handle it?
What response should I send back?
```

**Auth Service**

File: [auth.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/auth.ts:1>)

This is where the real auth logic lives.

It does three major jobs:

```txt
register user
verify login credentials
sign JWT token
```

During register, the service:

1. Checks email/password exist
2. Checks if user already exists
3. Hashes the password
4. Generates a user ID
5. Saves user to DB

This part matters:

```ts
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

[WHY THIS WAY]  
You never save raw passwords. If the database leaks, raw passwords expose users immediately. A hash is a one-way transformation. The app can check a password, but cannot read the original password back.

[REAL WORLD]  
Every serious backend hashes passwords: banking apps, school portals, stores, SaaS products. Storing plain passwords is one of the worst backend mistakes.

**Why `signToken(userId.id)` Works**

You asked earlier why this needs `.id`:

```ts
const userId = await authService.verifyCredentials(email, password);
const token = authService.signToken(userId.id);
```

Because `verifyCredentials` returns an object:

```ts
return { id: row.id };
```

So the variable name `userId` is a little misleading. It is not a string. It is this:

```ts
{ id: "some-user-id" }
```

That is why this fails:

```ts
signToken(userId)
```

because `signToken` expects:

```ts
string
```

but receives:

```ts
object
```

A clearer name would be:

```ts
const user = await authService.verifyCredentials(email, password);
const token = authService.signToken(user.id);
```

[CONCEPT TO REMEMBER]  
Good variable names reduce bugs. If the value is an object, don’t name it like a string.

**JWT Logic**

File: [jwt_middleware.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/middleware/jwt_middleware.ts:1>)

JWT means JSON Web Token.

In simple terms, a JWT is a signed badge.

When the user logs in, the server gives them a token:

```json
{
  "accessToken": "..."
}
```

Then the user sends it back on future requests:

```txt
Authorization: Bearer <token>
```

The middleware checks:

```ts
jwt.verify(token, JWT_SECRET)
```

If valid, it reads:

```ts
payload.sub
```

and attaches:

```ts
(req as any).user = { id: String(userId) };
```

[WHY THIS WAY]  
Controllers do not need to know how JWT works. They only need `req.user.id`.

[HOW THIS CONNECTS]  
This connects auth to transactions. Once `req.user.id` exists, the transaction controller can scope all data to the correct user.

[REAL WORLD]  
This is how many APIs protect dashboards, account pages, invoices, notes, orders, and user-owned resources.

**Development Auth vs Production Auth**

File: [auth_middleware.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/middleware/auth_middleware.ts:1>)

Development auth uses:

```txt
x-user-id
```

Production auth uses:

```txt
Authorization: Bearer token
```

In [app.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/app.ts:1>):

```ts
if (process.env.NODE_ENV === "production") {
  app.use(jwtAuth);
} else {
  app.use(devAuth);
}
```

[WHY THIS WAY]  
During learning/development, `x-user-id` is faster. You can test user scoping without building full login first. In production, you need real token-based identity.

[WHAT COULD GO WRONG]  
If you accidentally run production without `JWT_SECRET`, protected routes will fail. If you accidentally trust `x-user-id` in production, users can pretend to be anyone.

**Transaction Controllers After Auth**

File: [transaction.controller.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/controllers/transaction.controller.ts:1>)

Every important controller now reads:

```ts
const userId = (req as any).user?.id || "implicit";
```

Then passes it into the service:

```ts
tracker.listTransactions(filters, userId)
tracker.addTransaction(req.body, userId)
tracker.getBalance(userId)
```

This is one of the most important backend lessons in the project.

[WHY THIS WAY]  
Ownership should be enforced at the backend. A frontend can hide another user’s data visually, but only the backend can truly prevent access.

[REAL WORLD]  
If this were a banking app, this is what prevents one customer from seeing another customer’s transactions.

**Date Filtering Logic**

Your list controller now parses:

```txt
from
to
```

Example:

```txt
GET /transactions?from=2026-06-01&to=2026-06-30
```

The controller converts query strings into Date objects:

```ts
const from = new Date(String(req.query.from));
```

Then the service applies the filter:

```ts
t.date >= filters.from
t.date <= filters.to
```

[WHY THIS WAY]  
The controller handles HTTP-specific input parsing. The service handles business filtering.

[CONCEPT TO REMEMBER]  
Parse at the boundary. Apply business rules in the service.

This pattern appears everywhere in backend work:

```txt
HTTP string input -> controller parses/validates shape -> service uses clean values
```

**ExpenseTracker Still Matters Most**

File: [expenseTracker.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/expenseTracker.ts:1>)

Even though auth has been added, `ExpenseTracker` is still the financial brain.

It answers:

```txt
What is a valid transaction?
How do we calculate balance?
How do we count categories?
How do we prevent users from touching other users’ records?
```

The important repeated pattern is:

```ts
t.id === id && t.userId === userId
```

This shows up in get/update/delete.

[WHY THIS WAY]  
Finding only by `id` is not enough in multi-user systems. You must check ownership too.

[REAL WORLD]  
A URL like this is dangerous if ownership is not checked:

```txt
GET /transactions/abc123
```

If the backend only checks `id = abc123`, another user might access it. But if it checks:

```txt
id = abc123 AND userId = currentUser
```

then the record is protected.

**Repository And DB Design**

File: [sqliteTransactionRepository.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/repositories/sqliteTransactionRepository.ts:1>)

The transactions table has:

```sql
id TEXT PRIMARY KEY
description TEXT NOT NULL
amount REAL NOT NULL
type TEXT NOT NULL CHECK(type IN ('income', 'expense'))
category TEXT NOT NULL
date TEXT NOT NULL
userId TEXT NOT NULL
```

[WHY THIS WAY]  
The database also protects basic correctness.

For example:

```sql
CHECK(type IN ('income', 'expense'))
```

means even if buggy code tries to save `"transfer"` as a type, SQLite rejects it.

[CONCEPT TO REMEMBER]  
Good backend systems validate in layers:

```txt
controller/service validation
database constraints
tests/manual verification
```

No single layer should carry all responsibility.

**Users Table Design**

File: [create-user-table.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/scripts/create-user-table.ts:1>)

The project now has a users table script. Conceptually, a users table should store:

```txt
id
email
passwordHash
createdAt
```

[REAL WORLD]  
The `users` table is the identity source. Transactions then point back to a user through `userId`.

That relationship means:

```txt
one user -> many transactions
```

This is called a **one-to-many relationship**.

A real DB design would eventually make `transactions.userId` reference `users.id`.

That would look conceptually like:

```sql
FOREIGN KEY (userId) REFERENCES users(id)
```

[WHY THIS MATTERS]  
It prevents transactions from belonging to users that do not exist.

**Important Current Mismatches To Notice**

These are not insults to the code. These are learning signals.

In [create-user-table.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/scripts/create-user-table.ts:1>), the table uses:

```sql
username TEXT UNIQUE NOT NULL
```

But [auth.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/services/auth.ts:1>) expects:

```sql
email
```

So the DB design and auth service are not fully aligned yet.

Also, in `auth.ts`, the insert SQL appears incomplete:

```ts
"INSERT INTO users(id,email,passwordHash,createdAt) VALUES(?,?,?,?"
```

It should conceptually have the closing parenthesis:

```sql
VALUES(?,?,?,?)
```

Also, `jwtAuth` exists in both:

```txt
auth_middleware.ts
jwt_middleware.ts
```

That duplication can cause confusion. One source of truth is better.

And in [app.ts](</home/nanakwamw/projects/projects/AI PROJECTS/testxpense/src/app.ts:1>), `/transactions` appears mounted twice. That can lead to routes running twice or confusing behavior.

These are exactly the kind of architecture issues real backend developers learn to spot.

**Real-World Backend Lessons From This Project**

1. **Separate public routes from protected routes**

Auth routes are public. Transaction routes are protected.

This pattern applies to almost every backend:

```txt
/auth/login      public
/auth/register   public
/orders          protected
/profile         protected
/payments        protected
```

2. **Never trust client identity directly**

The frontend should not send:

```json
{ "userId": "abc" }
```

and expect the backend to trust it.

The backend should get the user from:

```txt
verified JWT
```

or, in development:

```txt
controlled dev middleware
```

3. **Pass ownership through the whole stack**

This project now teaches one of the most important backend ideas:

```txt
auth middleware identifies user
controller reads user
service enforces user ownership
repository persists userId
database stores userId
```

If any layer forgets ownership, data leaks become possible.

4. **Hash secrets, sign tokens**

Passwords are hashed. Tokens are signed.

Hashing protects stored passwords.

Signing proves the token came from your server.

5. **Use services for rules, repositories for storage**

This project keeps transaction math away from SQLite details.

That is how larger systems stay maintainable.

6. **Use database constraints as backup protection**

Your TypeScript code may have bugs. Your controller may miss validation. But database constraints can still block impossible data.

7. **Migrations matter once DB design changes**

When you added `userId`, older data had no user. That required migration/backfill logic.

This happens constantly in real backend work.

Example:

```txt
Old app: transactions have no userId
New app: transactions require userId
Migration: give old rows a fallback owner
```

**The Bigger Architecture You Are Building Toward**

Your project is moving toward this shape:

```txt
src/
  controllers/   HTTP request/response handling
  routes/        URL mapping
  services/      business rules
  repositories/  storage abstraction
  middleware/    request guards/auth/errors
  db/            database connection
  models/        TypeScript data contracts
  scripts/       migrations/setup tools
  tests/         safety checks
```

This layout is reusable.

You can apply the same structure to:

```txt
expense tracker
task manager
inventory system
school portal
booking app
e-commerce backend
banking dashboard
SaaS admin panel
```

The nouns change, but the backend logic stays similar.

For example:

```txt
ExpenseTracker.addTransaction()
TaskService.createTask()
OrderService.placeOrder()
BookingService.reserveRoom()
```

Same pattern:

```txt
validate input
identify user
apply business rule
save through repository
return clean result
```

**The Key Principle**

The project is no longer just about expenses.

It is teaching you this backend principle:

> A backend is a system that receives untrusted requests, identifies the user, validates the intent, applies business rules, persists state, and returns a controlled response.

That sentence describes almost every backend you will build.

Your current app does all of those pieces now, even if some parts still need polishing.