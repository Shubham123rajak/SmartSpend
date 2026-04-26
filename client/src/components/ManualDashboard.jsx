import { useEffect, useState } from "react";
import { expenseService } from "../services/expenseService";

const defaultForm = {
  amount: "",
  category: "Food",
  title: "",
  date: "",
};

function ManualDashboard() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  const loadExpenses = async () => {
    try {
      const data = await expenseService.getExpenses();
      setExpenses(data.expenses);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load expenses");
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreateExpense = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await expenseService.createExpense(form);
      setForm(defaultForm);
      await loadExpenses();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create expense");
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await expenseService.deleteExpense(id);
      await loadExpenses();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete expense");
    }
  };

  return (
    <div className="dashboard-grid">
      <section className="stack panel">
        <div>
          <h2>Add Expense</h2>
          <p className="muted">Enter an expense manually when you want full control.</p>
        </div>

        <form className="form-grid" onSubmit={handleCreateExpense}>
          <label className="field">
            <span>Amount</span>
            <input name="amount" type="number" step="0.01" value={form.amount} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Category</span>
            <select name="category" value={form.category} onChange={handleChange}>
              <option>Food</option>
              <option>Transport</option>
              <option>Shopping</option>
              <option>Bills</option>
              <option>Misc</option>
            </select>
          </label>

          <label className="field">
            <span>Title</span>
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Date</span>
            <input name="date" type="date" value={form.date} onChange={handleChange} required />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="button" type="submit">
            Save Expense
          </button>
        </form>
      </section>

      <section className="stack panel">
        <div>
          <h2>Recent Expenses</h2>
          <p className="muted">Review or remove your latest manual entries.</p>
        </div>

        <div className="expense-list">
          {expenses.map((expense) => (
            <article className="expense-row" key={expense.id}>
              <div>
                <strong>{expense.title}</strong>
                <p className="muted">
                  {expense.category} - {expense.date}
                </p>
              </div>
              <div className="toolbar">
                <strong>Rs. {expense.amount}</strong>
                <button
                  className="button secondary"
                  onClick={() => handleDeleteExpense(expense.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}

          {expenses.length === 0 ? <p className="muted">No expenses yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

export default ManualDashboard;
