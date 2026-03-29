import {useState, useEffect} from "react"
import { useAuth } from "../hooks/useAuth";
import { expenseService } from "../services/expenseService";

defaultForm = {
     amount: "",
     categry: "FOOD",
     title : "",
     date: ""
}
function practice(){
    const {user, logout} = useAuth();
    const {expense, setExpense} = useState([]);
    const {form, setForm} = useState(defaultForm);
    const {aiMessage, setAimessage} = useState("");
    const {error,setError} = useState("");

    const loadexpense = async () =>{
          try{
            const data = await expenseService.getExpenses();

            setExpense(data.expense)
          }catch(RequestError){
            setError(RquestError.response?.data?.message || "error in loading expense")
          }
    }

    useEffect(()=>{
      loadexpense();
    },[])

    const handleChange = (event) =>{
        setForm((current)=>({
           ...current,
        
           [event.target.name] : [event.tartget.value]
        }))
    }

    const handleCreateExpense = async (event) =>{
        event.prevantDefault();
        setError("");
        
        try{
         await expenseService.createExpense(form);
        setExpense(defaultFormd);
        await loadexpense()

        }catch(error){
            setError(error.response?.data?.message || "Enternal error")
        }
        
    }
    const handleDeletExpense = async (id) =>{
        try{
         await expenseService.deleteExpense(id);
         setExpense((prev)=> prev.filter((e)=>e.id!==e.id));
        }catch(error){
            setError(error.reponse?.data?.message);
        }

    }
    return (
        <div className="page-shell">
            <div className="cart">
                <section>
                    
                    <h2>Dashboard</h2>
                    <p> Welcome to expense {user.name}</p>
                    
                </section>
                <section className="stack">
          <h2>Parse with AI</h2>
          <div className="toolbar">
            <input
              value={aiText}
              onChange={(event) => setAiText(event.target.value)}
              placeholder="spent 200 on pizza"
            />
            <button className="button" onClick={handleParseExpense} type="button">
              Parse
            </button>
          </div>
        </section>
                <section>

                </section>
            </div>
            
        </div>
    )
}
/*
import { useEffect, useRef, useState } from "react";
import { expenseService } from "../services/expenseService";

const categories = ["Food", "Transport", "Shopping", "Bills", "Misc"];

function createMessage(role, content, expenseDraft = null) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    expenseDraft,
    saved: false,
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
  const messagesEndRef = useRef(null);

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
      const parsedExpense = {
        amount: data.expense.amount ?? "",
        category: categories.includes(data.expense.category) ? data.expense.category : "Misc",
        title: data.expense.title ?? "General Expense",
        date: new Date().toISOString().split("T")[0],
      };

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
        <div>
          <h2>Latest Expenses</h2>
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

*/