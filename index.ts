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
  console.log("5. Exit");

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
                tracker.addTransaction(
                  desc.trim(),
                  amount,
                  trimmedType,
                  cat.trim(),
                );
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
        console.log("Exiting...");
        rl.close();
        process.exit(0);

      default:
        console.log("Invalid option. Choose 1-5.");
        menu();
        break;
    }
  });
}

menu();
