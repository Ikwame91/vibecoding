# Programming Logic Guide

**A thinking manual for the testxpense project — and every project after it.**

Code is cheap to write. Logic is not. This document is about **how to think** before you type: stories, boundaries, states, and the mistakes that look like "small syntax" but actually break business rules.

Read a section before you build. Re-read a section after you debug.

---

## Table of contents

1. [The one sentence that matters](#the-one-sentence-that-matters)
2. [How this project is wired (mental map)](#how-this-project-is-wired-mental-map)
3. [Think in stories, not in files](#think-in-stories-not-in-files)
4. [The questions to ask before you code](#the-questions-to-ask-before-you-code)
5. [Layers and who is allowed to decide what](#layers-and-who-is-allowed-to-decide-what)
6. [Bugs we fixed — logic flaws, not typos](#bugs-we-fixed--logic-flaws-not-typos)
7. [Patterns you are already using](#patterns-you-are-already-using)
8. [Decision tables (your best friend)](#decision-tables-your-best-friend)
9. [Error boundaries — where failures must be caught](#error-boundaries--where-failures-must-be-caught)
10. [Partial updates — the merge mental model](#partial-updates--the-merge-mental-model)
11. [Validation — gates vs rules](#validation--gates-vs-rules)
12. [Control flow — menu, switch, async callbacks](#control-flow--menu-switch-async-callbacks)
13. [From CLI to REST API — same logic, new skin](#from-cli-to-rest-api--same-logic-new-skin)
14. [Pre-ship checklist](#pre-ship-checklist)
15. [When you are stuck](#when-you-are-stuck)
16. [Quick reference card](#quick-reference-card)

---

## The one sentence that matters

> **Every line of code should answer a user story or a failure story. If you cannot name the story, you are guessing.**

---

## How this project is wired (mental map)

Your expense tracker is not "a menu with a JSON file." It is four responsibilities:

```text
┌─────────────────────────────────────────────────────────────┐
│  index.ts          PRESENTATION                             │
│  - Show menu, ask questions, print results                  │
│  - Turn keystrokes into DTOs (CreateTransactionInput, etc.) │
│  - Catch AppError and show messages                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  expenseTracker.ts  BUSINESS LOGIC (domain)                 │
│  - CRUD on transactions in memory                           │
│  - Reports: balance, by category, counts                    │
│  - Does NOT know about readline or HTTP                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ uses
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  validation.ts           │  │  storage.ts              │
│  RULES                   │  │  PERSISTENCE             │
│  What is allowed?        │  │  Read/write JSON file    │
└──────────────────────────┘  └──────────────────────────┘
              ▲
              │ types from
┌──────────────────────────┐
│  models/transaction.ts   │
│  DATA SHAPE (contract)    │
└──────────────────────────┘
```

**Data flow for "add transaction":**

```text
User types → CLI builds CreateTransactionInput
          → validateCreateInput (rules)
          → new Transaction + push to array
          → persist() writes JSON
          → success message
```

**Rule:** Upper layers depend on lower layers. The service never depends on the CLI. That is why an API later can call the same service.

---

## Think in stories, not in files

Before opening an editor, write **stories** in plain English.

### Happy paths (examples from testxpense)

| ID | Story | Done when |
|----|-------|-----------|
| H1 | User adds a valid expense | Row in memory + JSON, menu returns |
| H2 | User views balance | Correct number (income − expenses) |
| H3 | User updates only the amount | Description/category unchanged |
| H4 | User deletes by id | Gone from list and file |
| H5 | User filters by category "food" | Only food rows shown |
| H6 | User filters with blank input | **All** rows shown (no filter) |

### Failure paths (these are not optional)

| ID | Story | Done when |
|----|-------|-----------|
| F1 | User adds amount 0 or negative | Rejected, nothing saved, clear message |
| F2 | User adds invalid type | Rejected |
| F3 | User updates with no fields | Rejected ("at least one field") |
| F4 | User updates with bad amount | Rejected, old data unchanged |
| F5 | User asks for unknown id | "Not found", nothing changes |
| F6 | JSON file corrupted | App starts fresh or recovers safely |

**Practice:** For every feature, list at least **one happy** and **two failure** stories. If you cannot, you do not understand the feature yet.

---

## The questions to ask before you code

Use this like a resonance checklist. Slow down and answer in words, not code.

### About the feature

1. **What is the user trying to accomplish?** (one sentence)
2. **What are all the ways this can succeed?**
3. **What are all the ways this can fail?** (bad input, missing data, wrong id)
4. **What must never change when this fails?** (e.g. other fields on update, other users' data later)

### About the data

5. **What object crosses the boundary?** (CreateTransactionInput, UpdateTransactionInput, filters)
6. **Which fields are required vs optional?**
7. **For updates: full replace or partial patch?** (We use **partial patch**.)

### About responsibility

8. **Which layer enforces the rule?** (Answer for business rules: **service + validation**, not only CLI.)
9. **Who will call this besides the CLI?** (Future: REST API, tests — they must get the same rules.)

### About control flow

10. **If the user picks menu option X, what runs — exactly one path or several?**
11. **Where can an error be thrown?** Is that entire path inside a `try/catch`?

### About persistence

12. **When is data written to disk?** (After every mutation: add, update, delete.)
13. **What happens on restart?** (Load file, revive dates.)

---

## Layers and who is allowed to decide what

| Layer | Allowed to | Must NOT |
|-------|------------|----------|
| **CLI (`index.ts`)** | Prompt, trim strings, build DTOs, display, catch AppError | Calculate balance, read JSON file, invent business rules |
| **Service (`expenseTracker.ts`)** | CRUD, reports, call validation, persist | Ask `rl.question`, know HTTP status codes |
| **Validation (`validation.ts`)** | Reject invalid input with AppError | Know about menus or files |
| **Storage (`storage.ts`)** | Read/write array to disk | Validate amount or type |
| **Models (`transaction.ts`)** | Describe shape of data | Contain behavior |

**Shallow thinking:** "I already check amount in the menu, so the service does not need to."  
**Deep thinking:** "The menu is optional. The service is the contract."

---

## Bugs we fixed — logic flaws, not typos

These happened in *this* project. They will happen again in different shapes. Recognize the **pattern**, not only the line.

---

### 1. Validation that always runs (the "empty patch" trap)

**Intended rule:** Reject update only when **no** fields are provided.

**Logic flaw:** The "at least one field" rejection ran **unconditionally** (or field-level checks were removed).

**Business impact:** Every update fails, even valid ones. Users cannot change anything.

**Thinking fix — two concerns:**

| Concern | Question |
|---------|----------|
| **Gate** | Is there anything to update at all? |
| **Rules** | For each field that *is* present, is it valid? |

```text
IF all fields undefined → reject (gate)
IF description provided → assert non-empty (rule)
IF amount provided     → assert > 0 (rule)
... etc.
```

**Ask yourself:** "Which rules apply in which **state** of the input?"

---

### 2. `try/catch` around the wrong scope

**Intended rule:** Bad add (e.g. amount ≤ 0) shows a message; app continues.

**Logic flaw:** `catch` wrapped early checks but not `addTransaction()`, which ran later in a nested callback.

**Business impact:** Service throws → uncaught → crash or confusing exit. User thinks CLI "validated" everything.

**Thinking fix:**

```text
Atomic action = everything that can fail together
Wrap: build DTO + call service
Not: wrap only the first parseFloat
```

**Ask yourself:** "What is the **smallest complete operation** I need to treat as success or failure?"

---

### 3. Hardcoded update body (lying to the domain)

**Intended rule:** User changes **only** what they enter; blank means "skip."

**Logic flaw:** CLI always sent all fields (`description: "Updated description", amount: 999, ...`).

**Business impact:** One field change overwrites everything. Data loss from the user's perspective.

**Thinking fix:**

```text
Intent → DTO keys → service merge
Only put keys on the DTO that the user meant to change
```

**Ask yourself:** "Does every key in this object represent something the user **decided**?"

---

### 4. Missing branch — blank filter

**Intended rule:** Blank filter = show all transactions.

**Logic flaw:** Code only ran when `if (value)` was truthy; empty input did nothing.

**Business impact:** Feature feels broken; user presses Enter and sees silence.

**Thinking fix:** For every `if`, list the **else**:

| Input | Behavior |
|-------|----------|
| empty | show all |
| "income" / "expense" | filter by type |
| other | filter by category |

**Ask yourself:** "Have I handled **every** input state, including empty?"

---

### 5. Switch fall-through (control flow ≠ business flow)

**Intended rule:** Menu option 1 does **only** add transaction.

**Logic flaw:** Missing `break` after case `"1"` caused cases 2, 3, 4, 5 to run in sequence.

**Business impact:** Add → list → balance → report → exit in one choice. Bizarre and data-corrupting.

**Thinking fix:** Simulate: "If I press 1, which cases execute, in order?"

**Ask yourself:** "Is exactly **one** business action tied to this user choice?"

---

### 6. Duplicate validation without a single authority

**Intended rule:** Invalid data never gets saved.

**Logic flaw:** CLI checks `NaN` but not `amount <= 0`; service checks both but CLI's `try/catch` did not wrap the service call.

**Business impact:** Inconsistent gates; some bad data slips through or crashes.

**Thinking fix:**

| Layer | Role |
|-------|------|
| CLI | UX — early hints |
| Service + validation | **Authority** — must always run |

**Ask yourself:** "If I added an API tomorrow with no CLI, would rules still hold?"

---

### 7. `__dirname` in ESM (environment story)

**Logic flaw:** Code assumed CommonJS; project used `"type": "module"`.

**Business impact:** App does not start; no transactions loaded or saved.

**Thinking fix:** "What **runtime** am I targeting? What does that environment provide?"

Not a business-rule bug — a **deployment/context** story. Still worth listing in failure stories.

---

## Patterns you are already using

You are not "only writing scripts." You are using patterns from production codebases.

| Pattern | Where in testxpense | Why it matters |
|---------|---------------------|----------------|
| **DTO** | `CreateTransactionInput`, `UpdateTransactionInput` | Same object for CLI, API, tests |
| **Domain service** | `ExpenseTracker` | One place for business rules |
| **Custom error** | `AppError` | Predictable failures → messages or HTTP codes |
| **Partial update (PATCH)** | `UpdateTransactionInput` with optional fields | Merge, do not replace whole row |
| **Repository-like** | `storage.ts` | Swap JSON for DB later |
| **Defensive I/O** | try/catch on JSON parse | Corrupt file does not kill startup |
| **Copy on read** | `[...this.transactions]` in list | Callers cannot mutate internal array |
| **Reduce** | balance, reports, counts | Fold many rows into one result |

---

## Decision tables (your best friend)

Before coding a `switch`, `if` chain, or validator, draw a table.

### Example: `validateUpdateInput`

| description | amount | type | category | Result |
|-------------|--------|------|----------|--------|
| undefined | undefined | undefined | undefined | **Reject** — nothing to update |
| set | undefined | undefined | undefined | Validate description only, merge |
| undefined | set | undefined | undefined | Validate amount only, merge |
| set | set | set | set | Validate all provided, merge |

### Example: menu option 11 (filter)

| User input | Filter object | Result |
|------------|---------------|--------|
| "" (blank) | none | `listTransactions()` — all |
| "income" | `{ type: "income" }` | filtered |
| "expense" | `{ type: "expense" }` | filtered |
| "food" | `{ category: "food" }` | filtered |

If a cell is empty in your planning, you have a bug waiting to happen.

---

## Error boundaries — where failures must be caught

```text
┌─────────────────────────────────────┐
│  CLI                                │
│  try {                              │
│    build DTO from user input        │
│    tracker.mutate(DTO)   ◄────────── include the service call
│  } catch (AppError) {               │
│    show message                     │
│  }                                  │
│  menu()                             │
└─────────────────────────────────────┘
         │
         ▼ throws AppError
┌─────────────────────────────────────┐
│  validation.ts → expenseTracker.ts  │
└─────────────────────────────────────┘
```

**Unexpected errors** (disk full, programmer bug): re-throw or log. **Expected business errors** (`AppError`): show user-friendly message.

---

## Partial updates — the merge mental model

**Existing row:**

```text
{ id: "abc", description: "Lunch", amount: 20, type: "expense", category: "food", date: ... }
```

**User patch (only amount):**

```text
{ amount: 25 }
```

**Correct merge:**

```text
{ ...existing, amount: 25 }
→ description still "Lunch", category still "food"
```

**Wrong approach (hardcoded or full replace):**

```text
{ description: "Updated", amount: 999, type: "income", category: "X" }
→ user lost "Lunch", "food", real type
```

**In code logic terms:**

1. Find row by id (or fail).
2. Copy existing object.
3. For each key in patch: if patch[key] is defined, overwrite.
4. Validate patch before merge.
5. Save entire array.

---

## Validation — gates vs rules

| Type | Meaning | Example |
|------|---------|---------|
| **Gate** | Can we proceed at all? | "At least one field in update" |
| **Rule** | Is this specific value OK? | amount > 0, type is income or expense |

Order matters:

```text
1. Run gate (empty patch?)
2. Run rules only on defined fields
3. Perform mutation
4. Persist
```

**Shallow:** One big function that throws at the end no matter what.  
**Deep:** Separate gate from per-field rules.

---

## Control flow — menu, switch, async callbacks

### Nested `rl.question` callbacks

Each question waits for the previous answer. Errors in the **innermost** callback are easy to leave **outside** a try/catch.

**Rule:** The try/catch should wrap the **deepest** action that uses validated data, including the service call.

### Switch

- One menu number → one `case` body → `break` (except intentional fall-through, which you should almost never use).
- After writing cases, **simulate** each number 1–12.

### Async alternative (future)

`async/await` flattens nesting and makes error boundaries easier to see. Same logic, clearer flow.

---

## From CLI to REST API — same logic, new skin

| CLI today | REST tomorrow | Same logic |
|-----------|---------------|------------|
| Menu option 1 | `POST /transactions` | `addTransaction` + `validateCreateInput` |
| Option 2 | `GET /transactions` | `listTransactions` |
| Option 8 | `GET /transactions/:id` | `getTransactionById` |
| Option 9 | `PATCH /transactions/:id` | `updateTransaction` + `validateUpdateInput` |
| Option 10 | `DELETE /transactions/:id` | `deleteTransaction` |
| Option 11 | `GET /transactions?category=food` | `listTransactions(filters)` |
| `AppError` message | HTTP 400 / 404 + JSON `{ error: "..." }` | Same rules |

**The service stays.** You only replace readline with `req.body` and `res.status()`.

---

## Pre-ship checklist

Before you consider a feature "done":

- [ ] Happy path story written and manually tested
- [ ] At least two failure stories tested
- [ ] Decision table has no empty cells
- [ ] Business rules enforced in service/validation (not only CLI)
- [ ] Error boundary wraps full mutation
- [ ] Partial update only sends defined fields
- [ ] Persist called after every mutation that should survive restart
- [ ] `npx tsc --noEmit` passes
- [ ] Restart app — data still correct

---

## When you are stuck

1. **Say the story out loud** — "The user wants to…"
2. **Draw the layers** — where should this logic live?
3. **Make a decision table** — all inputs vs outcomes
4. **Trace one failing input** — which line should have stopped it?
5. **Ask "who else calls this?"** — API, test, another function
6. **Reduce scope** — get one story working before adding menu options

Do not ask "what syntax do I need?" until you can answer "what should happen when?"

---

## Quick reference card

Print this in your head before every feature:

```text
STORIES     → What success and failure look like
STATES      → All shapes of input (empty, partial, invalid)
LAYERS      → CLI / service / validation / storage
DTO         → Honest object — keys = user intent
GATE + RULES→ When to reject vs what to validate
BOUNDARY    → try/catch around the full mutation
MERGE       → Partial update = only change sent fields
BRANCHES    → Every if has a planned else
SIMULATE    → "If user picks 1, what runs?"
AUTHORITY   → Service enforces rules, always
```

---

## Closing thought

You built a real layered app: models, validation, domain service, persistence, and a UI. The bugs you hit were not "bad at TypeScript" — they were **unfinished stories** (missing branch, wrong boundary, dishonest DTO, gate without rules).

In an age where code is cheap, **the valuable skill is specifying behavior clearly enough that any interface — CLI, API, test — cannot break your rules by accident.**

Keep this file next to the project. Update it when you catch a new mistake pattern. That is how you build a personal engineering playbook.

---

*Last updated: Phase 0 complete (CLI + CRUD + validation). Next: REST API (Stage 1).*
