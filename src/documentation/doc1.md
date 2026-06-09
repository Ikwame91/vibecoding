Database Filtering & Foreign Key Constraints Refactor
We have updated the architecture from memory-based array operations (.find() and .filter()) to a purely database-driven architecture where SQLite handles the querying, filtering, aggregation, and integrity constraints.

Why This Change Was Needed
Foreign Key Integrity: The transactions table did not have any database-level relationship with the users table. If someone deleted a user or inserted a transaction for a non-existent user, it went unnoticed. Now, a FOREIGN KEY constraint ensures that every transaction must belong to a valid user.
Access Control Security: Enforcing filtering via SQL queries (WHERE userId = ?) guarantees that a user can never retrieve, update, or delete another user's transactions, even if a controller accidentally forgets to apply an in-memory filter.
Database Efficiency: We no longer read all transactions from SQLite, deserialize them into JavaScript objects, and filter them in memory. Operations like balance calculation, category reporting, and transaction listing are fully pushed down to SQLite using built-in database aggregates (SUM, COUNT, GROUP BY).
Detailed Code Adjustments & Locations
1. The Repository Interface
File: 
transactionRepository.ts

We refactored TransactionRepository from a generic load/save interface to a fully features database query and mutation interface:

typescript
import type { Transaction, TransactionFilters } from "../models/transaction.js";
export interface TransactionRepository {
  add(transaction: Transaction): void;
  getById(id: string, userId: string): Transaction | null;
  delete(id: string, userId: string): boolean;
  update(id: string, updates: Partial<Transaction>, userId: string): Transaction | null;
  list(filters: TransactionFilters, userId: string): Transaction[];
  getTotalIncome(userId: string): number;
  getTotalExpenses(userId: string): number;
  getBalance(userId: string): number;
  getReportByCategory(userId: string): Record<string, number>;
  getTransactionCountPerCategory(userId: string): Record<string, number>;
}
2. SQLite Repository implementation & Migrations
File: 
sqliteTransactionRepository.ts

We added a self-healing migration script inside a transaction that:

Ensures the users table exists.
Inserts an implicit user so default/dev requests do not violate the FK constraint.
Checks if the existing transactions table has a foreign key to users. If not, it migrates the existing table's schema safely without data loss by renaming, copying, and dropping the old table.
Implements all SQL statements utilizing parameter binding (? placeholders) for performance and security.
3. Service Layer Cleanup
File: 
expenseTracker.ts

ExpenseTracker is now a pure service layer. It handles business logic, input validation, and formatting (trimming description and lowercasing category), while offloading query execution to the database:

typescript
export class ExpenseTracker {
  constructor(private readonly repository: TransactionRepository) {}
  addTransaction(input: CreateTransactionInput, userId = "implicit"): Transaction {
    validateCreateInput(input);
    const transaction: Transaction = {
      id: randomUUID(),
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      category: input.category.trim().toLocaleLowerCase(),
      date: new Date(),
      userId,
    };
    this.repository.add(transaction);
    return transaction;
  }
  
  // All other methods similarly delegate to this.repository...
}
4. Tests and Legacy Repositories Compatibility
Fake Repository: Updated FakeTransactionRepository in 
expenseTracker.test.ts
 to implement the new interface in-memory. Fixed a case mismatch ("Work" vs "work") in the tests.
JSON Repository: Updated 
jsonTransactionRepository.ts
 to support the new interface by performing the array actions inside the repository itself.
Migration Script: Aligned 
migrate-json-to-sqlite.ts
 to also create the tables with the new foreign key constraint.


 The Big Picture: Architectural Shift
Previously, your application kept a global in-memory state in the ExpenseTracker service class. The database was used only as a backup store: on startup, it loaded everything into memory, and on any change, it wiped the database and dumped memory back.

This is an anti-pattern for database applications. The refactored architecture relies on the Repository Pattern and Delegated DB Querying:

The DB (SQLite) is the single source of truth and handles data integrity and queries.
The Repository (SqliteTransactionRepository) is the translation layer. It translates TypeScript commands into SQL statements.
The Service (ExpenseTracker) is the orchestrator. It manages business rules (like input validation) and tells the repository what to do, without caring about how the data is stored.
Detailed Code Breakdown
Let's go file-by-file and line-by-line.

1. The Contract: src/repositories/transactionRepository.ts
Why it changed:
In the repository pattern, interfaces define what operations are possible, not how they are implemented. Previously, the interface was:

typescript
export interface TransactionRepository {
    loadAll(): Transaction[];
    saveAll(transactions: Transaction[]): void;
}
If we kept this interface, the database could not perform the filtering; we would still have to load all rows into memory first. We refactored it to define specific data operations.

Syntactic & Logical Breakdown:
typescript
export interface TransactionRepository {
  add(transaction: Transaction): void;
  getById(id: string, userId: string): Transaction | null;
  delete(id: string, userId: string): boolean;
  update(id: string, updates: Partial<Transaction>, userId: string): Transaction | null;
  list(filters: TransactionFilters, userId: string): Transaction[];
  getTotalIncome(userId: string): number;
  getTotalExpenses(userId: string): number;
  getBalance(userId: string): number;
  getReportByCategory(userId: string): Record<string, number>;
  getTransactionCountPerCategory(userId: string): Record<string, number>;
}
Partial<Transaction>: This is a TypeScript utility type. It makes all fields of Transaction optional. This is useful for update requests where the user might only want to change the description or amount, but not both.
Why pass userId to every method? By enforcing that every single query requires a userId, we ensure Multi-tenancy isolation. The repository guarantees that database access is gated by the owner's ID.
2. The Engine: src/repositories/sqliteTransactionRepository.ts
This is where the magic happens. Let's look at the database setup first.

A. Database Initialization and Self-Healing Schema Migrations
typescript
db.transaction(() => {
db.transaction(...): Enwraps all statements in a database transaction. If any part of the migrations fails (e.g. out of disk space, syntax error), the database rollbacks completely to its initial state, preventing database corruption.
typescript
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
db.exec(...): Runs static SQL strings. We ensure the users table exists first because our transactions table needs to point to it.
typescript
db.prepare(`
    INSERT OR IGNORE INTO users (id, email, passwordHash, createdAt)
    VALUES ('implicit', 'implicit@example.com', '', ?)
  `).run(new Date().toISOString());
INSERT OR IGNORE: If a row with id = 'implicit' already exists, SQLite will skip it rather than throwing an error.
Why do we need this? In development, users can make requests without logging in, resolving to an implicit user ID. Because we are enforcing a Foreign Key Constraint, SQLite will reject any transaction with userId = 'implicit' unless a corresponding user with the ID 'implicit' exists in the users table.
typescript
const tableInfo = db.prepare("PRAGMA foreign_key_list(transactions)").all();
  const hasUserForeignKey = tableInfo.some((fk: any) => fk.table === "users" && fk.to === "id");
PRAGMA foreign_key_list(transactions): This is a SQLite-specific command. It queries the system metadata to fetch all foreign key constraints on the transactions table.
tableInfo.some(...): We inspect the metadata array. If a relationship pointing to the users table's id column already exists, hasUserForeignKey will be true.
typescript
if (!hasUserForeignKey) {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'").get();
sqlite_master: A system catalog table in SQLite containing the schema descriptions of all database objects. We check if transactions exists.
Why rename and copy? SQLite does not support ALTER TABLE ... ADD FOREIGN KEY. The only way to add a foreign key to an existing table is a standard SQL migration pattern:
Rename the old table: ALTER TABLE transactions RENAME TO transactions_old;
Create the new table with the FOREIGN KEY constraint.
Ensure old data conforms to constraints: We fetch all unique user IDs from the old table and insert them into the users table so the new foreign key constraint doesn't fail.
Copy old records: INSERT INTO transactions SELECT ... FROM transactions_old;
Delete the temporary table: DROP TABLE transactions_old;
sql
FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
ON DELETE CASCADE: If a user is deleted from the users table, SQLite will automatically and atomically delete all their transactions. You don't have to write code to delete orphan records manually!
B. CRUD Methods & Parameterized Queries
Let's look at one write method (add) and one read method (list).

typescript
add(transaction: Transaction): void {
    db.prepare(`
      INSERT INTO transactions (id, description, amount, type, category, date, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      transaction.id,
      transaction.description,
      transaction.amount,
      transaction.type,
      transaction.category,
      transaction.date.toISOString(),
      transaction.userId
    );
  }
db.prepare(...): Compiles the SQL statement once.
? (Placeholders): Never concatenate strings in SQL (e.g. VALUES (' + desc + ')). String concatenation leads to SQL Injection vulnerabilities. Parameterized inputs separate the query code from the user data. The database engine sanitizes the inputs automatically.
.run(...): Executes write queries (INSERT, UPDATE, DELETE).
typescript
list(filters: TransactionFilters, userId: string): Transaction[] {
    let query = "SELECT id, description, amount, type, category, date, userId FROM transactions WHERE userId = ?";
    const params: any[] = [userId];
    if (filters.category) {
      query += " AND category = ?";
      params.push(filters.category);
    }
    ...
    query += " ORDER BY date DESC";
    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToTransaction);
  }
Dynamic Query Building: We dynamically append AND column = ? statements to the base query depending on which filters the user provides.
...params: We spread the parameters array matching the order of the ? placeholders.
.all(...): Executes read queries and returns all matching rows as an array.
C. Leveraging SQL Aggregations
Let's look at how we calculate balance and category reports inside the database.

typescript
getBalance(userId: string): number {
    const row = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance 
      FROM transactions 
      WHERE userId = ?
    `).get(userId) as { balance: number | null } | undefined;
    return row?.balance ?? 0;
  }
SUM(CASE WHEN ...): Inside the database, for each row matching the userId, if the transaction type is 'income', it treats amount as positive; if it is 'expense', it treats it as negative. It then sums them all up.
Why is this better? Instead of pulling 10,000 transaction objects over the network/process boundary into Node.js memory and running a JavaScript .reduce(), SQLite does the math in native C++ at the storage layer and returns a single number (e.g. 2500). This reduces CPU usage and memory footprint.
.get(...): Executes the query and returns only the first matching row (or undefined if no rows match).
typescript
getReportByCategory(userId: string): Record<string, number> {
    const rows = db.prepare(`
      SELECT 
        category,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total
      FROM transactions
      WHERE userId = ?
      GROUP BY category
    `).all(userId) as { category: string; total: number }[];
    ...
  }
GROUP BY category: Tells SQLite to split the transactions into buckets by their category, perform the sum calculation on each bucket separately, and return a set of rows (one row per category).
3. The Orchestrator: src/services/expenseTracker.ts
Why it changed:
Since the state is moved to the database, we deleted the private transactions: Transaction[] property.

Syntactic & Logical Breakdown:
typescript
updateTransaction(
    id: string,
    input: UpdateTransactionInput,
    userId = "implicit",
  ): Transaction {
    validateUpdateInput(input);
    const existing = this.repository.getById(id, userId);
    if (!existing) throw new AppError("Transaction not found", 404);
    const updates: Partial<Transaction> = {};
    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }
    ...
    const updated = this.repository.update(id, updates, userId);
    if (!updated) throw new AppError("Transaction not found", 404);
    return updated;
  }
Separation of Concerns: Notice how the ExpenseTracker service validates the input (validateUpdateInput) and trims input strings (formatting). It contains the business logic. The repository (SqliteTransactionRepository) contains the data access logic. The service does not write any SQL queries directly.
How to Apply this in Future Projects
When you design backends in the future, follow these principles:

Write self-healing schema initialization: When your app starts up, let the codebase initialize/verify the database tables. Don't rely on running separate manual script setups unless you are using migration frameworks like Prisma or Alembic.
Utilize foreign key cascades: Set up ON DELETE CASCADE and ON UPDATE CASCADE constraints so that your database takes care of cleaning up child records, rather than leaving orphan rows.
Keep services decoupled from databases: Always code against an interface (like TransactionRepository). This allows you to write unit tests using a fast mock/fake repository without hitting the actual database, and lets you swap SQLite for PostgreSQL down the line without changing a single line of your service or controller logic.
Filter at the database layer: Never fetch all rows into your programming language memory to filter or aggregate them. Always use WHERE, SUM, AVG, COUNT, and GROUP BY in your queries. Let the database do what it is optimized to do.