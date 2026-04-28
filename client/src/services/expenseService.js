import api from "./api";

export const expenseService = {
  getExpenses: async (range = "all") => {
    const response = await api.get("/expenses", {
      params: { range },
    });
    return response.data;
  },
  createExpense: async (payload) => {
    const response = await api.post("/expenses", payload);
    return response.data;
  },
  updateExpense: async (id, payload) => {
    const response = await api.put(`/expenses/${id}`, payload);
    return response.data;
  },
  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
  parseExpense: async (text) => {
    const response = await api.post("/expenses/ai", { text });
    return response.data;
  },
};
