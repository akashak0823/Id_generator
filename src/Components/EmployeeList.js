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

  // photo control state
  // modes: 'keep' (no change), 'replace-url', 'replace-file', 'delete', 'set-url' (create w/ url)
  const [photoMode, setPhotoMode] = useState("set-url");
  const [selectedFile, setSelectedFile] = useState(null);

  // QR / barcode modal state
  const [codesModalOpen, setCodesModalOpen] = useState(false);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesData, setCodesData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    qrDataUrl: null,
    barcodeDataUrl: null,
    verifyUrl: null,
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
    setPhotoMode("set-url");
    setSelectedFile(null);
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
    // if employee has an existing photo, default to keep; otherwise allow set-url
    setPhotoMode(emp.photo_url ? "keep" : "set-url");
    setSelectedFile(null);
    setShowForm(true);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleFileSelect(e) {
    const f = e.target.files && e.target.files[0];
    setSelectedFile(f || null);
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

      // Determine whether to send multipart (file) or JSON
      const useFileUpload = (isEditing && photoMode === "replace-file" && selectedFile) || (!isEditing && selectedFile);

      if (useFileUpload) {
        // Build FormData
        const fd = new FormData();
        // append text fields
        fd.append("first_name", formData.first_name);
        fd.append("last_name", formData.last_name);
        fd.append("position", formData.position || "");
        fd.append("email", formData.email || "");
        fd.append("contact", formData.contact || "");
        // other fields can be appended similarly if needed
        // append file under field name 'photo' (server expects this)
        fd.append("photo", selectedFile, selectedFile.name);

        if (isEditing) {
          res = await fetch(`${API_BASE}/api/employees/${encodeURIComponent(formData.employee_id)}`, {
            method: "PUT",
            body: fd,
          });
        } else {
          res = await fetch(`${API_BASE}/api/employees`, {
            method: "POST",
            body: fd,
          });
        }
      } else {
        // JSON path: determine photoUrl semantics
        const payload = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          position: formData.position || "",
          email: formData.email || "",
          contact: formData.contact || "",
        };

        if (isEditing) {
          if (photoMode === "replace-url") {
            // send the new URL in `photoUrl`
            payload.photoUrl = formData.photo_url || "";
          } else if (photoMode === "delete") {
            // sentinel instructing server to delete/clear existing photo
            // server must understand this sentinel and remove cloudinary image + clear fields
            payload.photoUrl = "__DELETE__";
          } else {
            // 'keep' -> do not include photoUrl (no change)
          }

          res = await fetch(`${API_BASE}/api/employees/${encodeURIComponent(formData.employee_id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          // create
          // choose provided URL if present
          if (formData.photo_url) payload.photoUrl = formData.photo_url;
          res = await fetch(`${API_BASE}/api/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
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
      // reset file input state
      setSelectedFile(null);
    }
  }

  function closeModal() {
    setShowForm(false);
  }

  // ---- QR/Barcode modal helpers ----
  async function openCodesModal(employee_id) {
    setCodesModalOpen(true);
    setCodesLoading(true);
    setCodesData({
      employee_id: "",
      first_name: "",
      last_name: "",
      qrDataUrl: null,
      barcodeDataUrl: null,
      verifyUrl: null,
    });

    try {
      const res = await fetch(`${API_BASE}/api/employees/${encodeURIComponent(employee_id)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch employee codes");
      const emp = data.employee || {};
      setCodesData({
        employee_id: emp.employee_id || employee_id,
        first_name: emp.first_name || "",
        last_name: emp.last_name || "",
        qrDataUrl: data.qrDataUrl || null,
        barcodeDataUrl: data.barcodeDataUrl || null,
        verifyUrl: data.verifyUrl || null,
      });
    } catch (err) {
      console.error("openCodesModal error:", err);
      alert(err.message || "Failed to load codes");
      setCodesModalOpen(false);
    } finally {
      setCodesLoading(false);
    }
  }

  function closeCodesModal() {
    setCodesModalOpen(false);
    setCodesData({
      employee_id: "",
      first_name: "",
      last_name: "",
      qrDataUrl: null,
      barcodeDataUrl: null,
      verifyUrl: null,
    });
    setCodesLoading(false);
  }

  // download dataURL by creating a temporary anchor
  function downloadDataUrl(dataUrl, filename) {
    if (!dataUrl) {
      alert("No image to download");
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // small reusable styles used inline for consistent alignment
  const cardStyle = {
    background: "#fff",
    padding: 12,
    borderRadius: 10,
    boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    height: "100%"
  };

  const topRowStyle = { display: "flex", gap: 12, alignItems: "center" };
  const metaStyle = { flex: 1, minWidth: 0 }; // minWidth:0 for text truncation in flex
  const nameStyle = { fontWeight: 700, color: "#123458", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const positionStyle = { fontSize: 13, color: "#666", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const idStyle = { fontSize: 12, color: "#888", marginTop: 8, fontFamily: "'Roboto Mono', monospace" };

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <form onSubmit={onSearch} style={{ flex: 1, display: "flex", gap: 8 }}>
          <input
            placeholder="Search name, email, contact or ID"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
            aria-label="Search employees"
          />
          <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}>
            Search
          </button>
        </form>

        <button onClick={() => fetchList({ query: "", off: 0 })} style={{ padding: "8px 12px", borderRadius: 8 }}>Refresh</button>

        <button onClick={openCreateModal} style={{ padding: "8px 12px", borderRadius: 8, background: "#1f9d55", color: "#fff", border: "none" }}>
          + Add Employee
        </button>
      </div>

      {loading ? <div>Loading…</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {employees.map(emp => (
          <div key={emp.employee_id} style={cardStyle}>

            {/* Top row: photo + basic meta */}
            <div style={topRowStyle}>
              <div style={{ width: 80, height: 80, flex: "0 0 80px" }}>
                {emp.photo_url ? (
                  <img src={emp.photo_url} alt={`${emp.first_name} ${emp.last_name} photo`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 8, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                    No Photo
                  </div>
                )}
              </div>

              <div style={metaStyle}>
                <div style={nameStyle} title={`${emp.first_name} ${emp.last_name}`}>{emp.first_name} {emp.last_name}</div>
                <div style={positionStyle} title={emp.position || "-"}>{emp.position || "-"}</div>
                <div style={idStyle} title={emp.employee_id}>{emp.employee_id}</div>
              </div>
            </div>

            {/* Spacer to push actions to bottom when card height grows */}
            <div style={{ flex: 1 }} />

            {/* Bottom row: left links + right actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <a href={emp.verify_url} target="_blank" rel="noreferrer" style={{ color: "#123458", fontWeight: 600, textDecoration: "none" }}>
                  Open Verify
                </a>

                <button
                  onClick={() => openCodesModal(emp.employee_id)}
                  style={{ background: "transparent", border: "none", color: "#123458", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  View Codes
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ color: "#666", fontSize: 13, whiteSpace: "nowrap" }}>{new Date(emp.created_at).toLocaleString()}</div>

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

      {/* Inline modal form for create/edit (unchanged behaviour) */}
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
              maxHeight: "90vh",
              overflowY: "auto"
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

              {/* PHOTO controls */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Photo</label>

                {/* Preview (when editing and have a photo) */}
                {isEditing && formData.photo_url ? (
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <img src={formData.photo_url} alt="preview" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                    <div style={{ color: "#666", fontSize: 13 }}>Current photo</div>
                  </div>
                ) : null}

                {/* Mode selection (radio buttons) */}
                <div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="photoMode" checked={photoMode === (isEditing ? "keep" : "set-url")} onChange={() => setPhotoMode(isEditing ? "keep" : "set-url")} />
                    <span style={{ fontSize: 13 }}>{isEditing ? "Keep" : "Use URL"}</span>
                  </label>

                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="photoMode" checked={photoMode === "replace-url"} onChange={() => setPhotoMode("replace-url")} />
                    <span style={{ fontSize: 13 }}>Replace (URL)</span>
                  </label>

                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="photoMode" checked={photoMode === "replace-file"} onChange={() => setPhotoMode("replace-file")} />
                    <span style={{ fontSize: 13 }}>Replace (Upload)</span>
                  </label>

                  {isEditing ? (
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="radio" name="photoMode" checked={photoMode === "delete"} onChange={() => setPhotoMode("delete")} />
                      <span style={{ fontSize: 13 }}>Delete Photo</span>
                    </label>
                  ) : null}
                </div>

                {/* Replace (URL) input */}
                {(photoMode === "replace-url" || (!isEditing && photoMode === "set-url")) && (
                  <div style={{ marginBottom: 8 }}>
                    <input
                      name="photo_url"
                      value={formData.photo_url}
                      onChange={handleFormChange}
                      placeholder="https://example.com/photo.jpg"
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                    />
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: "#666" }}>Provide a public image URL. If you want to upload a file, choose Replace (Upload).</small>
                    </div>
                  </div>
                )}

                {/* Replace (Upload) input */}
                {photoMode === "replace-file" && (
                  <div style={{ marginBottom: 8 }}>
                    <input type="file" accept="image/*" onChange={handleFileSelect} />
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: "#666" }}>Upload JPG/PNG/WEBP. File will be uploaded to the server (Cloudinary).</small>
                    </div>
                    {selectedFile ? <div style={{ marginTop: 6, color: "#333", fontSize: 13 }}>Selected: {selectedFile.name}</div> : null}
                  </div>
                )}

                {/* Delete note */}
                {photoMode === "delete" && (
                  <div style={{ color: "#a33", fontSize: 13, marginTop: 6 }}>Selecting Delete will remove the current photo from the employee record (server will delete previously uploaded image).</div>
                )}

                <div style={{ marginTop: 8 }}>
                  <small style={{ color: "#666" }}>If you upload a file it will be sent in `multipart/form-data`. If you provide a URL, the server will store that URL instead.</small>
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" onClick={closeModal} style={{ padding: "8px 12px", borderRadius: 8 }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}>
                  {actionLoading ? (isEditing ? "Saving…" : "Creating…") : (isEditing ? "Save Changes" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Codes modal (QR + Barcode) */}
      {codesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 10000,
          }}
          onClick={closeCodesModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 720,
              maxWidth: "95%",
              borderRadius: 12,
              background: "#fff",
              padding: 18,
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>QR & Barcode — {codesData.employee_id}</h3>
              <button onClick={closeCodesModal} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            {codesLoading ? (
              <div>Loading codes…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ textAlign: "center", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
                  <div style={{ fontSize: 13, marginBottom: 8, color: "#333" }}>QR Code</div>
                  {codesData.qrDataUrl ? (
                    <img src={codesData.qrDataUrl} alt="QR code" style={{ maxWidth: "100%", height: "auto", borderRadius: 6, border: "1px solid #ddd" }} />
                  ) : <div style={{ color: "#999" }}>Not available</div>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                    <button
                      onClick={() => downloadDataUrl(codesData.qrDataUrl, `${codesData.employee_id}-qr.png`)}
                      style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}
                    >
                      Download QR
                    </button>
                    {codesData.verifyUrl ? (
                      <a href={codesData.verifyUrl} target="_blank" rel="noreferrer" style={{ alignSelf: "center", color: "#123458", textDecoration: "none", fontSize: 14 }}>
                        Open verify page
                      </a>
                    ) : null}
                  </div>
                </div>

                <div style={{ textAlign: "center", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
                  <div style={{ fontSize: 13, marginBottom: 8, color: "#333" }}>Barcode</div>
                  {codesData.barcodeDataUrl ? (
                    <img src={codesData.barcodeDataUrl} alt="Barcode" style={{ maxWidth: "100%", height: "auto", borderRadius: 6, border: "1px solid #ddd" }} />
                  ) : <div style={{ color: "#999" }}>Not available</div>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                    <button
                      onClick={() => downloadDataUrl(codesData.barcodeDataUrl, `${codesData.employee_id}-barcode.png`)}
                      style={{ padding: "8px 12px", borderRadius: 8, background: "#123458", color: "#fff", border: "none" }}
                    >
                      Download Barcode
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
