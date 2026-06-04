import express from "express";
import cors from "cors";
import transactionRouter from "./routes/transaction.routes.js";
import { errorHandler } from "./middleware/error_middleware.js";
import authRouter from "./routes/auth.routes.js";
import { jwtAuth } from "./middleware/jwt_middleware.js";
import { devAuth } from "./middleware/auth_middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

if (process.env.NODE_ENV === "production") {
  app.use(jwtAuth);
} else {
  app.use(devAuth);
}

app.use("/transactions", transactionRouter);

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
export default app;
