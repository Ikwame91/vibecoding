export type TransactionType = "income" | "expense";

export interface Transaction {
    id: string;
    description : string;
    amount : number;
    type : TransactionType;
    category: string
    date : Date;
}