import api from "./api";

export const authService = {
  signup: async (payload) => {
    const response = await api.post("/auth/signup", payload);
    return response.data;
  },
  login: async (payload) => {
    const response = await api.post("/auth/login", payload);
    return response.data;
  },
};
