import express from "express";
import cors from "cors";
import transactionRouter from "./routes/transaction.routes.js";
import {errorHandler} from "./middleware/error_middleware.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/transactions", transactionRouter);
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
  
});
app.use(errorHandler);
export default app


