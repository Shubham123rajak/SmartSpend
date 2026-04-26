import { useState } from "react";
import AiDashboard from "../components/AiDashboard";
import ManualDashboard from "../components/ManualDashboard";
import { useAuth } from "../hooks/useAuth";

function Dashboard() {
  const { user, logout } = useAuth();
  const [spendMethod, setSpendMethod] = useState("ManualSpend");

  const spendMethodHandler = () => {
    setSpendMethod((prev) => (prev === "ManualSpend" ? "AiSpend" : "ManualSpend"));
  };

  return (
    <div>
      <div className="card stack dashboard-card">
        <div className="toolbar dashboard-toolbar">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">Welcome back, {user?.name || "User"}.</p>
          </div>

          <div className="toolbar">
            <button className="button secondary" onClick={spendMethodHandler} type="button">
              {spendMethod === "ManualSpend" ? "Switch to AI" : "Switch to Manual"}
            </button>

            <button className="button secondary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        {spendMethod === "ManualSpend" ? <ManualDashboard /> : <AiDashboard />}
      </div>
    </div>
  );
}

export default Dashboard;
