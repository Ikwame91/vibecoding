import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/** `node:crypto` `randomUUID` is collision-resistant IDs without npm deps—right for local file rows. */

type Expense = {
  id: string;
  description: string;
  amount: number;
};

const DATA_FILE = join(process.cwd(), "expenses.json");

function loadExpenses(): Expense[] {
  if (!existsSync(DATA_FILE)) return [];
  const raw = readFileSync(DATA_FILE, "utf8");
  if (raw.trim() === "") return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isExpense);
}

function isExpense(x: unknown): x is Expense {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["id"] === "string" &&
    typeof o["description"] === "string" &&
    typeof o["amount"] === "number" &&
    Number.isFinite(o["amount"])
  );
}

function saveExpenses(expenses: Expense[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2) + "\n", "utf8");
}

function printUsage(): void {
  console.log(`Usage:
  npm run dev -- add <description> <amount>
  npm run dev -- list
  npm run dev -- summary
  npm run dev -- delete <id>`);
}

function main(): void {
  const [, , cmd, ...args] = process.argv;

  if (cmd === undefined) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  switch (cmd) {
    case "add": {
      const amountStr = args.at(-1);
      const descParts = args.slice(0, -1);
      if (amountStr === undefined || descParts.length === 0) {
        console.error('Need: add "description parts" <amount>');
        process.exitCode = 1;
        return;
      }
      const description = descParts.join(" ");
      const amount = Number(amountStr);
      if (!Number.isFinite(amount)) {
        console.error("Amount must be a number.");
        process.exitCode = 1;
        return;
      }
      const expenses = loadExpenses();
      const row: Expense = {
        id: randomUUID(),
        description,
        amount,
      };
      expenses.push(row);
      saveExpenses(expenses);
      console.log(`Added [${row.id}] ${row.description} — ${row.amount}`);
      break;
    }
    case "list": {
      const expenses = loadExpenses();
      if (expenses.length === 0) {
        console.log("(no expenses yet)");
        break;
      }
      for (const e of expenses) {
        console.log(`${e.id}\t${e.amount}\t${e.description}`);
      }
      break;
    }
    case "summary": {
      const expenses = loadExpenses();
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      console.log(`Total: ${total}`);
      break;
    }
    case "delete": {
      const id = args[0];
      if (id === undefined) {
        console.error("Need: delete <id>");
        process.exitCode = 1;
        return;
      }
      const expenses = loadExpenses();
      const next = expenses.filter((e) => e.id !== id);
      if (next.length === expenses.length) {
        console.error("No expense with that id.");
        process.exitCode = 1;
        return;
      }
      saveExpenses(next);
      console.log("Deleted.");
      break;
    }
    default:
      printUsage();
      process.exitCode = 1;
  }
}

main();
