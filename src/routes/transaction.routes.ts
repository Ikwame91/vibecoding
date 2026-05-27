import { Router } from "express";
import * as transactionController from "../controllers/transaction.controller.js";

const router = Router();

router.get("/", transactionController.list);
router.get("/balance", transactionController.balance);
router.get(
  "/reports/by-category",
  transactionController.reportByCategory,
);
router.get("/reports/income", transactionController.totalIncome);
router.get("/reports/expenses", transactionController.totalExpenses);
router.get("/reports/counts", transactionController.countPerCategory);

router.get("/:id", transactionController.getbyId);
router.post("/", transactionController.create);
router.patch("/:id", transactionController.update);
router.delete("/:id", transactionController.remove);


export default router;
