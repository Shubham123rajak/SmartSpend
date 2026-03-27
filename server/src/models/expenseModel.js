import { pool } from "../config/db.js";

export async function createExpenseRecord({ userId, amount, category, title, date }) {
  const query = `
    INSERT INTO expenses (user_id, amount, category, title, date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, amount, category, title, date
  `;

  const result = await pool.query(query, [userId, amount, category, title, date]);
  return result.rows[0];
}

export async function getExpensesByUserId(userId) {
  const query = `
    SELECT id, amount, category, title, date
    FROM expenses
    WHERE user_id = $1
    ORDER BY date DESC, id DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

export async function updateExpenseRecord({ id, userId, amount, category, title, date }) {
  const query = `
    UPDATE expenses
    SET amount = $1, category = $2, title = $3, date = $4
    WHERE id = $5 AND user_id = $6
    RETURNING id, amount, category, title, date
  `;

  const result = await pool.query(query, [amount, category, title, date, id, userId]);
  return result.rows[0];
}

export async function deleteExpenseRecord(id, userId) {
  const query = "DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id";
  const result = await pool.query(query, [id, userId]);
  return result.rows[0];
}
