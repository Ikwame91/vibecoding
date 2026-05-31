export type TransactionType = "income" | "expense";

export interface Transaction {
    id: string;
    description : string;
    amount : number;
    type : TransactionType;
    category: string
    date : Date;
    userId : string; 
}

export interface CreateTransactionInput{
    description: string,
    amount: number,
    type : TransactionType,
    category: string
}


export interface UpdateTransactionInput{
    description?: string,
    amount?: number,
    type ?: TransactionType,
    category?: string
}

export interface TransactionFilters{
    category?: string;
    type?: TransactionType;
    from?: Date;
    to?: Date;
}

// Real APIs use DTOs (data transfer objects). 
// The CLI will build these objects and pass them to the service.

