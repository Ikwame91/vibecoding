import { Router } from "express";
import * as transactionController from "../controllers/transaction.controller.js";

const router = Router();

router.get("/", transactionController.list);
router.get("/:id", transactionController.getbyId);
router.post("/", transactionController.create);


export default router;

