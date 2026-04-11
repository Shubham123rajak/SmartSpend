import {
  createExpenseRecord,
  deleteExpenseRecord,
  getExpensesByUserId,
  updateExpenseRecord,
} from "../models/expenseModel.js";
import { parseExpenseText } from "../services/aiService.js";

export async function createExpense(request, response, next) {
  try {
    const { amount, category, title, date } = request.body;

    if (!amount || !category || !title || !date) {
      return response.status(400).json({ message: "Amount, category, title, and date are required" });
    }

    const expense = await createExpenseRecord({
      userId: request.user.id,
      amount,
      category,
      title,
      date,
    });

    return response.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
}

export async function getExpenses(request, response, next) {
  try {
    const expenses = await getExpensesByUserId(request.user.id);
    return response.json({ expenses });
  } catch (error) {
    next(error);
  }
}

export async function updateExpense(request, response, next) {
  try {
    const { id } = request.params;
    const { amount, category, title, date } = request.body;

    const expense = await updateExpenseRecord({
      id,
      userId: request.user.id,
      amount,
      category,
      title,
      date,
    });

    if (!expense) {
      return response.status(404).json({ message: "Expense not found" });
    }

    return response.json({ expense });
  } catch (error) {
    next(error);
  }
}

export async function deleteExpense(request, response, next) {
  try {
    const deleted = await deleteExpenseRecord(request.params.id, request.user.id);

    if (!deleted) {
      return response.status(404).json({ message: "Expense not found" });
    }

    return response.json({ message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function parseExpense(request, response, next) {
  try {
    const { text } = request.body;

    if (!text) {
      return response.status(400).json({ message: "Text is required" });
    }

    const expense = await parseExpenseText(text);
    console.log(expense)
    return response.json({ expense });
  } catch (error) {
    next(error);
  }
}

