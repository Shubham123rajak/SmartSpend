import axios from "axios";

export async function parseExpenseText(text) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
  const response = await axios.post(`${aiServiceUrl}/parse-expense`, { text });
  return response.data;
}
