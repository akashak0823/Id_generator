import React, { useEffect, useState } from "react";
import "./EmployeeForm.css"; // reuse your existing styles

// change if your server isn't running at localhost:4000
const API_BASE = process.env.REACT_APP_API_BASE || "https://id-backend-yuqp.onrender.com";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // for delete/create/edit actions

  // modal/form state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    position: "",
    email: "",
    contact: "",
    photo_url: "",
  });

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
      // refresh list; keep offset
      await fetchList({ query: q, off: offset });
      alert("Deleted successfully");
    } catch (err) {
      console.error("delete error:", err);
      alert(err.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  }

  // Open modal for creating a new employee
  function openCreateModal() {
    setIsEditing(false);
    setFormData({
      employee_id: "",
      first_name: "",
      last_name: "",
      position: "",
      email: "",
      contact: "",
      photo_url: "",
    });
    setShowForm(true);
  }

  // Open modal for editing an existing employee
  function openEditModal(emp) {
    setIsEditing(true);
    setFormData({
      employee_id: emp.employee_id || "",
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      position: emp.position || "",
      email: emp.email || "",
      contact: emp.contact || "",
      photo_url: emp.photo_url || "",
    });
    setShowForm(true);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    // basic validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      alert("Please provide first and last name.");
      return;
    }

    setActionLoading(true);
    try {
      let res, data;
      if (isEditing) {
        // PUT update
        res = await fetch(`${API_BASE}/api/employees/${encodeURIComponent(formData.employee_id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        // POST create
        res = await fetch(`${API_BASE}/api/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      data = await res.json();
      if (!data.success) throw new Error(data.error || (isEditing ? "Update failed" : "Create failed"));

      // refresh list and close modal
      await fetchList({ query: q, off: offset });
      setShowForm(false);
      alert(isEditing ? "Updated successfully" : "Created successfully");
    } catch (err) {
      console.error("form submit error:", err);
      alert(err.message || "Failed to submit");
    } finally {
      setActionLoading(false);
    }
  }

  function closeModal() {
    setShowForm(false);
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

        <button onClick={openCreateModal} style={{ padding: "8px 12px", borderRadius: 8, background: "#1f9d55", color: "#fff", border: "none" }}>
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
                  onClick={() => openEditModal(emp)}
                  style={{ padding: "6px 10px", borderRadius: 8, background: "#2b7be3", color: "#fff", border: "none" }}
                >
                  Edit
                </button>

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

      {/* Inline modal form for create/edit */}
      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            zIndex: 9999,
          }}
          onClick={closeModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 720,
              maxWidth: "95%",
              borderRadius: 12,
              background: "#fff",
              padding: 18,
              boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{isEditing ? "Edit Employee" : "Create Employee"}</h3>
              <button onClick={closeModal} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / 2" }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>First Name</label>
                <input name="first_name" value={formData.first_name} onChange={handleFormChange} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
              </div>

              <div style={{ gridColumn: "2 / 3" }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Last Name</label>
                <input name="last_name" value={formData.last_name} onChange={handleFormChange} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Position</label>
                <input name="position" value={formData.position} onChange={handleFormChange} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Employee ID</label>
                <input
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleFormChange}
                  readOnly={isEditing} // prevent changing id when editing; remove if backend allows id change
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", background: isEditing ? "#f5f6f7" : "white" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Email</label>
                <input name="email" value={formData.email} onChange={handleFormChange} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Contact</label>
                <input name="contact" value={formData.contact} onChange={handleFormChange} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Photo URL</label>
                <input name="photo_url" value={formData.photo_url} onChange={handleFormChange} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }} />
                <div style={{ marginTop: 8 }}>
                  <small style={{ color: "#666" }}>Provide a public image URL, or leave empty. You can store images on your server and save the returned URL here.</small>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" onClick={closeModal} style={{ padding: "8px 12px", borderRadius: 8 }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}>
                  {actionLoading ? (isEditing ? "Saving…" : "Creating…") : (isEditing ? "Save Changes" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
