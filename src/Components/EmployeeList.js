import React, { useEffect, useState } from "react";
import "./EmployeeForm.css"; // reuse your existing styles

// change if your server isn't running at localhost:4000
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // for delete/create actions

  async function fetchList({ query = "", lim = limit, off = 0 } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      params.append("limit", String(lim));
      params.append("offset", String(off));
      const res = await fetch(`${API_BASE}/api/employees?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch");
      setEmployees(data.employees);
      setHasMore(data.employees.length === lim);
      setOffset(off);
    } catch (err) {
      console.error("fetchList error:", err);
      alert(err.message || "Failed to fetch employees");
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
    fetchList({ query: q, off: 0 });
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
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/employees/${encodeURIComponent(employee_id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      // refresh list; stay on the same page if possible
      const nextOffset = Math.min(offset, Math.max(0, (offset) ));
      await fetchList({ query: q, off: nextOffset });
      alert("Deleted successfully");
    } catch (err) {
      console.error("delete error:", err);
      alert(err.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  }

  function openCreateForm() {
    // assumes you expose a route /create that renders EmployeeForm,
    // otherwise open the page where the form lives or show inline modal.
    // This keeps the list simple — change to modal if you want inline editing.
    window.open("/create", "_blank");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <form onSubmit={onSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
          <input
            placeholder="Search name, email, contact or ID"
            value={q}
            onChange={e => setQ(e.target.value)}
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

      {loading ? <div>Loading…</div> : null}

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
                  disabled={actionLoading}
                  style={{ padding: "6px 10px", borderRadius: 8, background: "#e13b3b", color: "#fff", border: "none" }}
                >
                  Delete
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
