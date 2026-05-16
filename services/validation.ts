import type {
  CreateTransactionInput,
  TransactionType,
  UpdateTransactionInput,
} from "../models/transaction.js";
import { AppError } from "./errors.js";

//initialize Transaction 
  


export function assertValidAmount(amount: number) {
  //Nan or <=0-> throw AppError
  if (isNaN(amount) || amount <= 0) {
    throw new AppError("Amount must be a positive number");
  }
}

export function assertNonEmpty(value: string, fieldName: string) {
  //empty/whitespace -- throw
  if (!value || value.trim() === "") {
    throw new AppError(`${fieldName} cannot be empty`);
  }
}

export function assertValidType(type:string){
    //not income/expense -- throw
    if(type !== "income" && type !== "expense"){
        throw new AppError("Type must be 'income' or 'expense'");
    }
}


export function validateCreateInput(input: CreateTransactionInput){
    assertNonEmpty(input.description, "Description");
    assertValidAmount(input.amount);
    assertValidType(input.type);
    assertNonEmpty(input.category, "Category");

}

export function validateInput(input: UpdateTransactionInput){
    if(input.description !== undefined){
        assertNonEmpty(input.description, "Description");
    }
    if(input.amount !== undefined){
        assertValidAmount(input.amount);
    }
    if(input.type !== undefined){
        assertValidType(input.type);
    }
    if(input.category !== undefined){
        assertNonEmpty(input.category, "Category");
    }
}