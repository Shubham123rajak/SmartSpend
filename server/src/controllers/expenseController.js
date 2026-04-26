import {
  createExpenseRecord,
  deleteExpenseRecord,
  getExpensesByUserId,
  updateExpenseRecord,
  getExpenseSummaryByDateRange,
} from "../models/expenseModel.js";
import { parseExpenseText } from "../services/aiService.js";

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeParsedExpense(rawExpense = {}) {
  return {
    intent: rawExpense.intent ?? "CREATE_EXPENSE",
    amount: rawExpense.amount ?? null,
    category: rawExpense.category ?? null,
    title: rawExpense.title?.trim() || "General Expense",
    date: rawExpense.date ?? null,
    start_date: rawExpense.start_date ?? null,
    end_date: rawExpense.end_date ?? null,
  };
}

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
    const text = request.body?.text?.trim();

    if (!text) {
      throw createHttpError("Text is required");
    }

    const expense = normalizeParsedExpense(await parseExpenseText(text));
    console.log(expense);
    if (!expense.intent) {
      throw createHttpError("AI service returned an invalid response", 502);
    }

    if (expense.intent === "QUERY_EXPENSE") {
      if (!expense.start_date || !expense.end_date) {
        throw createHttpError("Start date and end date are required for expense queries", 422);
      }

      const expenseSummary = await getExpenseSummaryByDateRange(
        request.user.id,
        expense.category,
        expense.start_date,
        expense.end_date
      );
      console.log(expenseSummary);
      return response.json({
        intent: expense.intent,
        filters: {
          start_date: expense.start_date,
          end_date: expense.end_date,
          category: expense.category,
        },
        summary: expenseSummary,
      });
    }

    return response.json({
      intent: expense.intent,
      expense,
    });
  } catch (error) {
    next(error);
  }
}
