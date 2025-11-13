import React, { useState, useEffect } from "react";
import "./EmployeeForm.css";

export default function EmployeeForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    address: "",
    position: "",
    contact: "",
    dob: "",
    blood_group: "",
    email: "",
    dept: "",
    other: ""
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function update(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function onPhotoChange(e) {
    const f = e.target.files?.[0];
    if (!f) {
      setPhotoFile(null);
      return;
    }
    // optional client-side validation
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      alert("Only JPG, PNG or WEBP allowed");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      alert("Photo too large (max 3MB)");
      return;
    }
    setPhotoFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      // append text fields
      Object.entries(form).forEach(([k, v]) => fd.append(k, v || ""));
      // append photo if present (field name 'photo')
      if (photoFile) fd.append("photo", photoFile);

      const res = await fetch("http://localhost:4000/api/employees", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Server error");
      setResult(data);
      // optionally clear form or keep for next
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="employee-container">
      <div className="brand-header">
        <img src="/logo.png" alt="ARTIBOTS Logo" className="brand-logo" />
        <span className="brand-title">ARTIBOTS</span>
      </div>

      <h2 className="form-title">Employee ID Generator</h2>

      <form onSubmit={submit} className="form-grid">
        <input required placeholder="First name" value={form.first_name} onChange={e => update("first_name", e.target.value)} />
        <input required placeholder="Last name" value={form.last_name} onChange={e => update("last_name", e.target.value)} />
        <input placeholder="Position" value={form.position} onChange={e => update("position", e.target.value)} />
        <input placeholder="Department" value={form.dept} onChange={e => update("dept", e.target.value)} />
        <input placeholder="Contact" value={form.contact} onChange={e => update("contact", e.target.value)} />
        <input placeholder="Email" value={form.email} onChange={e => update("email", e.target.value)} />
        <input placeholder="DOB (YYYY-MM-DD)" value={form.dob} onChange={e => update("dob", e.target.value)} />
        <input placeholder="Blood group" value={form.blood_group} onChange={e => update("blood_group", e.target.value)} />
        <input className="full" placeholder="Address" value={form.address} onChange={e => update("address", e.target.value)} />
        <input className="full" placeholder="Other" value={form.other} onChange={e => update("other", e.target.value)} />

        {/* Photo input (placed inside the form) */}
        <div style={{display:"flex", alignItems:"center", gap:12, marginTop:4}}>
          <label style={{fontSize:13, color:"#666", minWidth:80}}>Photo</label>
          <input type="file" accept="image/*" onChange={onPhotoChange} />
          {photoPreview && (
            <img src={photoPreview} alt="preview" style={{width:64, height:64, objectFit:"cover", borderRadius:8, border:"1px solid rgba(0,0,0,0.06)"}} />
          )}
        </div>

        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Employee"}
          </button>
        </div>
      </form>

      {result && (
        <div className="result-section">
          <div className="result-box">
            <h4>Employee ID: {result.employee_id}</h4>

            {result.photoUrl ? (
              <div style={{marginBottom:10}}>
                <img src={result.photoUrl} alt="employee" style={{width:120, height:120, objectFit:"cover", borderRadius:8, display:"block", margin:"0 auto 8px"}} />
                <div className="mono">Photo</div>
              </div>
            ) : null}

            <img alt="QR" src={result.qrDataUrl} className="qr-image" />
            <div>
              <a href={result.qrDataUrl} download={`${result.employee_id}-qr.png`}>Download QR</a>
            </div>
          </div>

          <div className="result-box">
            <h4>Barcode (Code128)</h4>
            <img alt="Barcode" src={result.barcodeDataUrl} className="barcode-image" />
            <div>
              <a href={result.barcodeDataUrl} download={`${result.employee_id}-barcode.png`}>Download Barcode</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
