import { useEffect, useRef, useState } from "react";
import { expenseService } from "../services/expenseService";

const categories = ["Food", "Transportation", "Housing", "Utilities", "Entertainment", "Shopping", "Health", "Education",
  "Travel", "Personal Care", "Bills", "Groceries", "Subscriptions", "Investments", "Gifts", "Misc" ];

const expenseFilters = [
  { label: "All", value: "all" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Week", value: "lastWeek" },
  { label: "Last Month", value: "lastMonth" },
];

function calculateTotalExpense(expenses = []) {
  return expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
}

function createMessage(role, content, expenseDraft = null) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    expenseDraft,
    saved: false,
  };
}

function formatSummaryMessage(summary = {}, filters = {}) {
  const totalAmount = summary?.total_amount ?? "0.00";
  const expenseCount = summary?.expense_count ?? 0;
  const startDate = filters?.start_date ?? "the selected start date";
  const endDate = filters?.end_date ?? "the selected end date";
  const category = filters?.category ?? "";

  // if (category == "ALL"){
  //   return `Your total expense category wise are:
  //   ${summary.map((summary)=>{
      
  //   })}
  //   `
  // }

  if (expenseCount === 0) {
    return `I could not find any expenses between ${startDate} and ${endDate}.`;
  }

  return `You spent Rs. ${totalAmount} across ${expenseCount} expenses in ${category} between ${startDate} and ${endDate}.`;
}

function buildExpenseDraftFromResponse(data) {
  const expense = data?.expense ?? {};

  return {
    intent: data?.intent ?? "CREATE_EXPENSE",
    amount: expense.amount ?? "",
    category: categories.includes(expense.category) ? expense.category : "Misc",
    title: expense.title ?? "General Expense",
    date: expense.date ?? new Date().toISOString().split("T")[0],
  };
}

function AiDashboard() {
  const [messages, setMessages] = useState([
    createMessage(
      "bot",
      "Tell me an expense like 'spent 250 on lunch' and I will prepare it for you to save."
    ),
  ]);
  const [expenses, setExpenses] = useState([]);
  const [draftText, setDraftText] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [expenseRange, setExpenseRange] = useState("all");
  const messagesEndRef = useRef(null);
  const totalExpense = calculateTotalExpense(expenses);

  const loadExpenses = async () => {
    try {
      const data = await expenseService.getExpenses(expenseRange);
      setExpenses(data.expenses);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load expenses");
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [expenseRange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();

    if (!draftText.trim()) {
      return;
    }

    const text = draftText.trim();
    setMessages((current) => [...current, createMessage("user", text)]);
    setDraftText("");
    setError("");

    try {
      const data = await expenseService.parseExpense(text);
      const intent = data?.intent ?? "CREATE_EXPENSE";

      if (intent === "QUERY_EXPENSE") {
        setMessages((current) => [
          ...current,
          createMessage(
            "bot",
            formatSummaryMessage(data?.summary, data?.filters)
          ),
        ]);
        return;
      }

      const parsedExpense = buildExpenseDraftFromResponse(data);

      setMessages((current) => [
        ...current,
        createMessage(
          "bot",
          `I parsed this as ${parsedExpense.title} for Rs. ${parsedExpense.amount} in ${parsedExpense.category}. Review it and save when ready.`,
          parsedExpense
        ),
      ]);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to parse expense";
      setError(message);
      setMessages((current) => [
        ...current,
        createMessage("bot", "I could not parse that. Try a sentence like 'spent 300 on groceries'."),
      ]);
    }
  };

  const handleDraftChange = (messageId, field, value) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              expenseDraft: {
                ...message.expenseDraft,
                [field]: value,
              },
            }
          : message
      )
    );
  };

  const handleSaveDraft = async (messageId, expenseDraft) => {
    setSavingId(messageId);
    setError("");

    try {
      await expenseService.createExpense(expenseDraft);
      await loadExpenses();

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                saved: true,
                content: `Saved ${expenseDraft.title} for Rs. ${expenseDraft.amount} in ${expenseDraft.category}.`,
              }
            : message
        )
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save expense");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="dashboard-grid">
      <section className="stack panel">
        <div>
          <h2>AI Expense Chat</h2>
          <p className="muted">Describe your spending naturally and save the parsed result.</p>
        </div>

        <div className="chat-shell">
          <div className="chat-messages">
            {messages.map((message) => (
              <article
                className={`chat-bubble ${message.role === "user" ? "user" : "bot"}`}
                key={message.id}
              >
                <p>{message.content}</p>

                {message.expenseDraft ? (
                  <div className="chat-draft">
                    <label className="field">
                      <span>Amount</span>
                      <input
                        type="number"
                        step="0.01"
                        value={message.expenseDraft.amount}
                        onChange={(event) =>
                          handleDraftChange(message.id, "amount", event.target.value)
                        }
                        disabled={message.saved}
                      />
                    </label>

                    <label className="field">
                      <span>Category</span>
                      <select
                        value={message.expenseDraft.category}
                        onChange={(event) =>
                          handleDraftChange(message.id, "category", event.target.value)
                        }
                        disabled={message.saved}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Title</span>
                      <input
                        value={message.expenseDraft.title}
                        onChange={(event) =>
                          handleDraftChange(message.id, "title", event.target.value)
                        }
                        disabled={message.saved}
                      />
                    </label>

                    <label className="field">
                      <span>Date</span>
                      <input
                        type="date"
                        value={message.expenseDraft.date}
                        onChange={(event) =>
                          handleDraftChange(message.id, "date", event.target.value)
                        }
                        disabled={message.saved}
                      />
                    </label>

                    <button
                      className="button"
                      type="button"
                      onClick={() => handleSaveDraft(message.id, message.expenseDraft)}
                      disabled={message.saved || savingId === message.id}
                    >
                      {message.saved ? "Saved" : savingId === message.id ? "Saving..." : "Save Expense"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-form" onSubmit={handleSend}>
            <input
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder="spent 200 on pizza"
            />
            <button className="button" type="submit">
              Send
            </button>
          </form>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="stack panel">
        <div className="toolbar">
          <h2>Latest Expenses</h2>
          <div className="filter-group" role="tablist" aria-label="Expense range">
            {expenseFilters.map((filter) => (
              <button
                key={filter.value}
                className={`button secondary filter-button ${expenseRange === filter.value ? "active" : ""}`}
                onClick={() => setExpenseRange(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="expense-total-row">
            <span className="muted">Total for selected filter</span>
            <strong>Rs. {totalExpense.toFixed(2)}</strong>
          </div>
          <p className="muted">Your saved expenses update here after each AI confirmation.</p>
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
              <strong>Rs. {expense.amount}</strong>
            </article>
          ))}

          {expenses.length === 0 ? <p className="muted">No expenses saved yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

export default AiDashboard;
