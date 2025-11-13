import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import EmployeeForm from "./Components/EmployeeForm";
import EmployeeList from "./Components/EmployeeList";

function App() {
  return (
    <Router>
      <div className="App">
        {/* Simple navigation bar */}
        <nav
          style={{
            background: "#123458",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "white",
          }}
        >
          <div style={{ fontWeight: 700, letterSpacing: 1 }}>ARTIBOTS</div>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link
              to="/"
              style={{ color: "#4ED7F1", textDecoration: "none", fontWeight: 600 }}
            >
              Add Employee
            </Link>
            <Link
              to="/employees"
              style={{ color: "#4ED7F1", textDecoration: "none", fontWeight: 600 }}
            >
              Employee List
            </Link>
          </div>
        </nav>

        {/* Routing views */}
        <Routes>
          {/* Default route (Employee form) */}
          <Route path="/" element={<EmployeeForm />} />

          {/* List page */}
          <Route path="/employees" element={<EmployeeList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
