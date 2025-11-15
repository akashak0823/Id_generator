import React, { useEffect, useState } from "react";
import "./EmployeeForm.css"; // reuse your existing styles

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  async function fetchList({ query = "", lim = limit, off = 0 } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      params.append("limit", String(lim));
      params.append("offset", String(off));
      const res = await fetch(`https://id-backend-yuqp.onrender.com/api/employees?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch");
      setEmployees(data.employees);
      setHasMore(data.employees.length === lim);
      setOffset(off);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
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

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <form onSubmit={onSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
          <input
            placeholder="Search name, email, contact or ID"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          />
          <button style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}>Search</button>
        </form>

        <button onClick={() => fetchList({ query: "", off: 0 })} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Refresh
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

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "space-between" }}>
              <a href={emp.verify_url} target="_blank" rel="noreferrer" style={{ color: "#123458", fontWeight: 600 }}>Open Verify</a>
              <div style={{ color: "#666", fontSize: 13 }}>{new Date(emp.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={goPrev} disabled={offset === 0} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Prev
        </button>
        <div style={{ alignSelf: "center", color: "#666" }}>Showing {employees.length} items</div>
        <button onClick={goNext} disabled={!hasMore} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Next
        </button>
      </div>
    </div>
  );
}

