import ManualDashboard from "../components/ManualDashboard"
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";


function Dashboard() {

  const { user, logout } = useAuth();
  const [spendMethod,setSpendMethod] = useState("ManualSpend");

 const spendMethodHandler = () => {
    setSpendMethod((prev) =>
      prev === "ManualSpend" ? "AiSpend" : "ManualSpend"
    );
  };
  
  return (
    <div className="page-shell">
      <div className="card stack">
      <div className="toolbar">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">Welcome back, {user?.name || "User"}.</p>
          </div>
          <button
            className="button secondary"
            onClick={spendMethodHandler}
            type="button"
          >
            {spendMethod === "ManualSpend" ? "AiSpend" : "ManualSpend"}
          </button>
          
          <button className="button secondary" onClick={logout} type="button">
            Logout
          </button>
        </div>
      <ManualDashboard/>
        </div>
    </div>
  );
}

export default Dashboard;
