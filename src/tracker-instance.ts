import { JsonTransactionRepository } from "./repositories/jsonTransactionRepository.js";
import { ExpenseTracker } from "./services/expenseTracker.js";
export const tracker = new ExpenseTracker(new JsonTransactionRepository());
