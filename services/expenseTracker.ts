import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from "../models/transaction.js";
import { randomUUID } from "node:crypto";
import { loadTransactions, saveTransactions } from "../utils/storage.js";
import { validateCreateInput } from "./validation.js";
import { AppError } from "./errors.js";

export class ExpenseTracker {
  private transactions: Transaction[] = [];
  private persist(): void {
    saveTransactions(this.transactions);
  }

  constructor() {
    this.transactions = loadTransactions();
  }
  addTransaction(input: CreateTransactionInput):Transaction {
    validateCreateInput(input);
    const transaction: Transaction = {
      id: randomUUID(),
      description: input.description.trim(),
      amount:input.amount,
      type: input.type,
      category: input.category.trim(),
      date: new Date(),
    };
    this.transactions.push(transaction);
    this.persist();
    return transaction;
  }


  getTransactionById(id:string){
    //find by id ; if missing throw Apperror
    const index = this.transactions.find()
            

  }

  dleteTransaction(id:string){
    //fidn index if -1 throw;splcie;persist(); return true
 const index = this.transactions.findIndex((t)=> t.id=== id);
 if(index===-1) throw new AppError("Transaction not found ")
    

  }

  updateTransaction(id: string ,input:UpdateTransactionInput){
    //validateupdateinput; find; mergefiedls with ..existing
      
  }

  getTotalIncome() {
    return this.transactions.reduce((total, t) => {
      if (t.type === "income") {
        return total + t.amount;
      }
      return total;
    }, 0);
  }

  //array.reduce((accumulator,currentValue)=>{},initialValue)
  getTotalexpenses() {
    return this.transactions.reduce((total, e) => {
      if (e.type === "expense") {
        return total + e.amount;
      }
      return total;
    }, 0);
  }

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
    return this.transactions.reduce(
      (count, c) => {
        count[c.category] = (count[c.category] || 0) + 1;
        return count;
      },
      {} as Record<string, number>,
    );
  }


  
}
