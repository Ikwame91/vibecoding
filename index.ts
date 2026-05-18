import { Transaction, TransactionFilters } from "./models/transaction.js";
import { AppError } from "./services/errors.js";
import { ExpenseTracker } from "./services/expenseTracker.js";
import readline from "readline";

const tracker = new ExpenseTracker();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function menu() {
  console.log("\n--- Expense tracker ---");
  console.log("1. Add transaction");
  console.log("2. View all transactions");
  console.log("3. View balance");
  console.log("4. View report by category");
  console.log("5. Total income");
  console.log("6. Total expenses");
  console.log("7. count per category");
  console.log("8. Get by id");
  console.log("9. Update by Id");
  console.log("10. Delete by Id");
  console.log("11. Filter transactions");
  console.log("12. Exit");

  rl.question("Choose an option: ", (choice) => {
    switch (choice.trim()) {
      case "1":
        rl.question("Description: ", (desc) => {
          rl.question("Amount: ", (amt) => {
            rl.question("Type (income/expense): ", (type) => {
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
              rl.question("Category: ", (cat) => {
                tracker.addTransaction({
                  description: desc.trim(),
                  amount,
                  type: trimmedType,
                  category: cat.trim(),
                });
                console.log("Transaction added successfully");
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
        console.log(`Total expenses: ${tracker.getTotalexpenses()}`);
        menu();
        break;

      case "7":
        console.log("Count per category:");
        console.log(
          JSON.stringify(tracker.getTransactionCountPerCategory(), null, 2),
        );
        menu();

      case "8":
        rl.question("Enter transaction ID: ", (id) => {
          try {
            const transaction = tracker.getTransactionById(id.trim());
            if (transaction) {
              console.log(JSON.stringify(transaction, null, 2));
            } else {
              console.log("Transaction not found.");
            }
          } catch (error) {
            if (error instanceof AppError) console.log(error.message);
            else throw error;
          }
          menu();
        });
        break;

      case "9":
        rl.question("Enter transaction ID to update:", (id) => {
          try {
            const updateId = tracker.updateTransaction(id.trim(), {});
            console.log(
              "Updated transaction:",
              JSON.stringify(updateId, null, 2),
            );
          } catch (error) {
            if (error instanceof AppError) console.log(error.message);
            else throw error;
          }
          menu();
        });
        break;

      case "10":
        rl.question("Enter transaction ID to delete:", (id) => {
          try {
            const deleteId = tracker.deleteTransaction(id.trim());
            console.log("Deleted transaction:", deleteId);
          } catch (error) {
            if (error instanceof AppError) console.log(error.message);
            else throw error;
          }
          menu();
        });
        break;

      case "11":
        rl.question(
          "Filter by type (income/expense) or category (leave blank for no filter): ",
          (input) => {
            try {
              const value = input.trim().toLocaleLowerCase();
              const filters: TransactionFilters = {};

              if (value) {
                const transactionType =
                  value === "income" || value === "expense";

                if (transactionType) {
                  filters.type = value;
                } else {
                  filters.category = value;
                }
                const filteredTransactions = tracker.listTransactions(filters);
                if (filteredTransactions.length === 0) {
                  console.log("No transactions match the filter.");
                } else {
                  console.log(
                    "Filtered transactions:",
                    JSON.stringify(filteredTransactions, null, 2),
                  );
                }
              }
            } catch (error) {
              if (error instanceof AppError) console.log(error.message);
              else throw error;
            }
            menu();
          },
        );
        break;

      case "12":
        console.log("Exiting...");
        rl.close();
        break;

      default:
        console.log("Invalid option. Choose 1-12.");
        menu();
        break;
    }
  });
}

menu();
