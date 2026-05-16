
import type {Transaction} from '../models/transaction.js'
import { randomUUID } from "node:crypto";
import { loadTransactions,saveTransactions } from '../utils/storage.js';



export class ExpenseTracker {
    private transactions: Transaction[]=[];

    constructor(){
        this.transactions = loadTransactions();
    }
    addTransaction(description: string, amount:number, type: "income"| "expense", category:string){
        const transaction: Transaction={
            id: randomUUID(),
            description,
            amount,
            type,
            category,
            date: new Date(),
        };
        this.transactions.push(transaction);
        saveTransactions(this.transactions)
        return transaction;
    }

    getBalance(){
        return this.transactions.reduce((balance,t)=>{
            if(t.type === "income"){
                return balance + t.amount;
            }
            return balance - t.amount;
        },0);
    }

getReportByCategory(){
    return this.transactions.reduce((report,t)=>{
        report[t.category]= (report[t.category] || 0) + (t.type=== "income"? t.amount : -t.amount);
        return report;

    }, {} as Record<string,number>)
}

    listTransactions(){
        return [...this.transactions];
    }
}