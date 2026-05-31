import {SqliteTransactionRepository} from "./repositories/sqliteTransactionRepository.js";
import { ExpenseTracker } from "./services/expenseTracker.js";


const repository = new SqliteTransactionRepository();
export const tracker = new ExpenseTracker(repository);