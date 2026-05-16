import type { Transaction } from "../models/transaction.js";
import { randomUUID } from "node:crypto";
import { loadTransactions, saveTransactions } from "../utils/storage.js";

export class ExpenseTracker {
  private transactions: Transaction[] = [];

  constructor() {
    this.transactions = loadTransactions();
  }
  addTransaction(
    description: string,
    amount: number,
    type: "income" | "expense",
    category: string,
  ) {
    const transaction: Transaction = {
      id: randomUUID(),
      description,
      amount,
      type,
      category,
      date: new Date(),
    };
    this.transactions.push(transaction);
    saveTransactions(this.transactions);
    return transaction;
  }
  getTotalIncome() {
    return this.transactions.reduce((total, t) => {
      if (t.type === "income") {
        return (total = total + t.amount);
      }
      return total;
    }, 0);
  }

  //array.reduce((accumulator,currentValue)=>{},initialValue)
  totalexpenses() {
    return this.transactions.reduce((total, e) => {
      if (e.type === "expense") {
        return (total = total + e.amount);
      }
      return total;
    }, 0);
  }

  transactionsCountPerCategory() {}

  getBalance() {
    return this.transactions.reduce((balance, t) => {
      if (t.type === "income") {
        return balance + t.amount;
      }
      return balance - t.amount;
    }, 0);
  }

  getReportByCategory() {
    return this.transactions.reduce(
      (report, t) => {
        report[t.category] =
          (report[t.category] || 0) +
          (t.type === "income" ? t.amount : -t.amount);
        return report;
      },
      {} as Record<string, number>,
    );
  }

  listTransactions() {
    return [...this.transactions];
  }

  transactionCountPerCategory() {
    return this.transactions.reduce((count, c) => {
    count[c.category]= (count[c.category] || 0) +  1;
    return count;
    },{} as Record<string,number>);
  }
}

// {
//     food: -200,
//     salary: 5000,
//     transport: -50
// }

//take many values and reduce them into one value

// getBalance(){
//     return this.transactions.reduce((balance,t)=>{
//         if(t.type === "income"){
//             return balance + t.amount;
//         }
//         return balance - t.amount;
//     },0);
// }

// getReportByCategory(){
// return this.transactions.reduce((report---accumulator,t---current transaction)=>{
//     report[t.category]= (report[t.category] || 0) + (t.type=== "income"? t.amount : -t.amount);
//     return report;

// }, {} as Record<string,number>)
// }

// listTransactions(){
//     return [...this.transactions];
// }
// }
