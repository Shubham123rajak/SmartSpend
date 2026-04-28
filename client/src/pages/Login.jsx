import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const payload =
        mode === "signup"
          ? await authService.signup(form)
          : await authService.login({ email: form.email, password: form.password });

      login(payload);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="page-shell">
      <div className="card auth-card">
        <div>
          <h1>SmartSpend</h1>
          <p className="muted">Track, parse, and manage your expenses in one place.</p>
        </div>

        <div className="toolbar">
          <button className="button secondary" onClick={() => setMode("login")} type="button">
            Login
          </button>
          <button className="button secondary" onClick={() => setMode("signup")} type="button">
            Sign Up
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="field">
              <span>Name</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="button" type="submit">
            {mode === "signup" ? "Create Account" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
