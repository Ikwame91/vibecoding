import type {
  TransactionFilters,
  TransactionType,
  UpdateTransactionInput,
} from "./src/models/transaction.js";
import { AppError } from "./src/services/errors.js";
import { ExpenseTracker } from "./src/services/expenseTracker.js";
import readline from "readline";
import { tracker } from "./src/tracker-instance.js";


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function handleError(error: unknown): void {
  if (error instanceof AppError) {
    console.log(error.message);
  } else {
    throw error;
  }
}

function menu() {
  console.log("\n--- Expense tracker ---");
  console.log("1. Add transaction");
  console.log("2. View all transactions");
  console.log("3. View balance");
  console.log("4. View report by category");
  console.log("5. Total income");
  console.log("6. Total expenses");
  console.log("7. Count per category");
  console.log("8. Get by id");
  console.log("9. Update by id");
  console.log("10. Delete by id");
  console.log("11. Filter transactions");
  console.log("12. Exit");

  rl.question("Choose an option: ", (choice) => {
    switch (choice.trim()) {
      case "1":
        rl.question("Description: ", (desc) => {
          rl.question("Amount: ", (amt) => {
            rl.question("Type (income/expense): ", (type) => {
              rl.question("Category: ", (cat) => {
                try {
                  const trimmedType = type.trim();
                  if (trimmedType !== "income" && trimmedType !== "expense") {
                    console.log("Type must be 'income' or 'expense'");
                    menu();
                    return;
                  }
                  const amount = parseFloat(amt);
                  if (Number.isNaN(amount)) {
                    console.log("Amount must be a number");
                    menu();
                    return;
                  }
                  tracker.addTransaction({
                    description: desc.trim(),
                    amount,
                    type: trimmedType,
                    category: cat.trim(),
                  });
                  console.log("Transaction added successfully");
                } catch (error) {
                  handleError(error);
                }
                menu();
              });
            });
          });
        });
        break;

      case "2": {
        const transactions = tracker.listTransactions();
        if (transactions.length === 0) {
          console.log("No transactions yet.");
        } else {
          console.log(JSON.stringify(transactions, null, 2));
        }
        menu();
        break;
      }

      case "3":
        console.log(`Balance: ${tracker.getBalance()}`);
        menu();
        break;

      case "4":
        console.log("Report by category:");
        console.log(JSON.stringify(tracker.getReportByCategory(), null, 2));
        menu();
        break;

      case "5":
        console.log(`Total income: ${tracker.getTotalIncome()}`);
        menu();
        break;

      case "6":
        console.log(`Total expenses: ${tracker.getTotalExpenses()}`);
        menu();
        break;

      case "7":
        console.log("Count per category:");
        console.log(
          JSON.stringify(tracker.getTransactionCountPerCategory(), null, 2),
        );
        menu();
        break;

      case "8":
        rl.question("Enter transaction ID: ", (id) => {
          try {
            const transaction = tracker.getTransactionById(id.trim());
            console.log(JSON.stringify(transaction, null, 2));
          } catch (error) {
            handleError(error);
          }
          menu();
        });
        break;

      case "9":
        rl.question("Enter transaction ID to update: ", (id) => {
          rl.question("Description (blank to skip): ", (desc) => {
            rl.question("Amount (blank to skip): ", (amt) => {
              rl.question("Type income/expense (blank to skip): ", (type) => {
                rl.question("Category (blank to skip): ", (cat) => {
                  try {
                    const input: UpdateTransactionInput = {};

                    if (desc.trim()) input.description = desc.trim();

                    if (amt.trim()) {
                      const amount = parseFloat(amt);
                      if (Number.isNaN(amount)) {
                        console.log("Amount must be a number");
                        menu();
                        return;
                      }
                      input.amount = amount;
                    }

                    if (type.trim()) {
                      const trimmedType = type.trim();
                      if (
                        trimmedType !== "income" &&
                        trimmedType !== "expense"
                      ) {
                        console.log("Type must be 'income' or 'expense'");
                        menu();
                        return;
                      }
                      input.type = trimmedType as TransactionType;
                    }

                    if (cat.trim()) input.category = cat.trim();

                    const updated = tracker.updateTransaction(id.trim(), input);
                    console.log("Updated transaction:");
                    console.log(JSON.stringify(updated, null, 2));
                  } catch (error) {
                    handleError(error);
                  }
                  menu();
                });
              });
            });
          });
        });
        break;

      case "10":
        rl.question("Enter transaction ID to delete: ", (id) => {
          try {
            tracker.deleteTransaction(id.trim());
            console.log("Transaction deleted successfully.");
          } catch (error) {
            handleError(error);
          }
          menu();
        });
        break;

      case "11":
        rl.question(
          "Filter by type (income/expense) or category (blank = show all): ",
          (input) => {
            try {
              const value = input.trim().toLowerCase();

              if (!value) {
                const all = tracker.listTransactions();
                if (all.length === 0) {
                  console.log("No transactions yet.");
                } else {
                  console.log(JSON.stringify(all, null, 2));
                }
              } else {
                const filters: TransactionFilters = {};

                if (value === "income" || value === "expense") {
                  filters.type = value;
                } else {
                  filters.category = value;
                }

                const filteredTransactions = tracker.listTransactions(filters);
                if (filteredTransactions.length === 0) {
                  console.log("No transactions match the filter.");
                } else {
                  console.log(JSON.stringify(filteredTransactions, null, 2));
                }
              }
            } catch (error) {
              handleError(error);
            }
            menu();
          },
        );
        break;

      case "12":
        console.log("Exiting...");
        rl.close();
        process.exit(0);

      default:
        console.log("Invalid option. Choose 1-12.");
        menu();
        break;
    }
  });
}

menu();
