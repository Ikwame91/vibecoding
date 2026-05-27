import type {Transaction} from '../models/transaction.js';

export interface TransactionRepository{
    loadAll(): Transaction[];
    saveAll(transactions:Transaction[]): void;
}
