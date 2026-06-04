import db from "../db/database.js";

db.exec(
    `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        createdAt TEXT NOT NULL
    );
    `
);
console.log("User table created successfully");