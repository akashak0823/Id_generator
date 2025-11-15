import React, { useEffect, useState, useRef } from "react";
import "./EmployeeForm.css"; // reuse your existing styles

const API_BASE = process.env.REACT_APP_API_BASE || "https://id-backend-yuqp.onrender.com";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [rowDeleting, setRowDeleting] = useState({}); // { [employee_id]: true }
  const [error, setError] = useState(null);

  const searchTimeout = useRef(null);

  async function fetchList({ query = "", lim = limit, off = 0 } = {}) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      params.append("limit", String(lim));
      params.append("offset", String(off));
      const url = `${API_BASE}/api/employees?${params.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch");
      setEmployees(data.employees || []);
      setHasMore((data.employees || []).length === lim);
      setOffset(off);
    } catch (err) {
      console.error("fetchList error:", err);
      setError(err.message || "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e) {
    e.preventDefault();
    // immediate search on form submit
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    fetchList({ query: q, off: 0 });
  }

  // debounced input handler (so typing doesn't call API constantly)
  function onSearchChange(e) {
    const v = e.target.value;
    setQ(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchList({ query: v, off: 0 });
    }, 300);
  }

  function goNext() {
    fetchList({ query: q, off: offset + limit });
  }

  function goPrev() {
    const nextOff = Math.max(0, offset - limit);
    fetchList({ query: q, off: nextOff });
  }

  async function handleDelete(employee_id) {
    const ok = window.confirm(`Delete employee ${employee_id}? This will remove the record and server-uploaded photo (if any).`);
    if (!ok) return;
    setRowDeleting(prev => ({ ...prev, [employee_id]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/employees/${encodeURIComponent(employee_id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      // Remove from UI quickly
      setEmployees(prev => prev.filter(e => e.employee_id !== employee_id));
      // If list becomes empty and offset > 0, fetch previous page
      if (employees.length === 1 && offset > 0) {
        const prevOff = Math.max(0, offset - limit);
        fetchList({ query: q, off: prevOff });
      }
    } catch (err) {
      console.error("delete error:", err);
      alert(err.message || "Failed to delete");
    } finally {
      setRowDeleting(prev => {
        const next = { ...prev };
        delete next[employee_id];
        return next;
      });
    }
  }

  function openCreateForm() {
    // adjust route if your form is hosted at a different path
    window.open("/create", "_blank");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <form onSubmit={onSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
          <input
            placeholder="Search name, email, contact or ID"
            value={q}
            onChange={onSearchChange}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}>
            Search
          </button>
        </form>

        <button onClick={() => fetchList({ query: "", off: 0 })} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Refresh
        </button>

        <button onClick={openCreateForm} style={{ padding: "8px 12px", borderRadius: 8, background: "#1f9d55", color: "#fff", border: "none" }}>
          + Add Employee
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, color: "crimson" }}>
          {error} — <button onClick={() => fetchList({ query: q, off: offset })}>Retry</button>
        </div>
      )}

      {loading ? <div>Loading…</div> : null}

      {!loading && employees.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: "#666" }}>
          No employees found. Try refreshing or add a new employee.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {employees.map(emp => (
          <div key={emp.employee_id} style={{ background: "#fff", padding: 12, borderRadius: 10, boxShadow: "0 6px 14px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 80, height: 80, flex: "0 0 80px" }}>
                {emp.photo_url ? (
                  <img src={emp.photo_url} alt="photo" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 8, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                    No Photo
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#123458" }}>{emp.first_name} {emp.last_name}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{emp.position || "-"}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>{emp.employee_id}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={emp.verify_url} target="_blank" rel="noreferrer" style={{ color: "#123458", fontWeight: 600 }}>Open Verify</a>
                <a href={`${API_BASE}/api/employees/${encodeURIComponent(emp.employee_id)}`} target="_blank" rel="noreferrer" style={{ color: "#555", textDecoration: "none" }}>
                  View JSON
                </a>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ color: "#666", fontSize: 13 }}>{new Date(emp.created_at).toLocaleString()}</div>
                <button
                  onClick={() => handleDelete(emp.employee_id)}
                  disabled={!!rowDeleting[emp.employee_id]}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: rowDeleting[emp.employee_id] ? "#ccc" : "#e13b3b",
                    color: "#fff",
                    border: "none",
                    cursor: rowDeleting[emp.employee_id] ? "progress" : "pointer"
                  }}
                >
                  {rowDeleting[emp.employee_id] ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={goPrev} disabled={offset === 0 || loading} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Prev
        </button>
        <div style={{ alignSelf: "center", color: "#666" }}>Showing {employees.length} items</div>
        <button onClick={goNext} disabled={!hasMore || loading} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Next
        </button>
      </div>
    </div>
  );
}
