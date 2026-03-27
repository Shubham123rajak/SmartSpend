import { Router } from "express";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  parseExpense,
  updateExpense,
} from "../controllers/expenseController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createExpense);
router.get("/", getExpenses);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);
router.post("/ai", parseExpense);

export default router;
