import React, { useState, useEffect } from "react";
import "./EmployeeForm.css";

function parseDDMMYYYY(value) {
  // Accepts "DD-MM-YYYY" or "D-M-YYYY" variants; returns "YYYY-MM-DD" or null if invalid
  if (!value) return null;
  const trimmed = value.trim();
  const parts = trimmed.split(/[-\/\.]/); // allow - or / or .
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  // pad day/month if needed
  if (d.length === 1) d = "0" + d;
  if (m.length === 1) m = "0" + m;
  // handle 2-digit years (assume 19xx/20xx? we'll refuse)
  if (y.length === 2) {
    // ambiguous — reject to force 4-digit year
    return null;
  }
  if (y.length !== 4) return null;

  const dayNum = Number(d);
  const monthNum = Number(m);
  const yearNum = Number(y);
  if (!Number.isInteger(dayNum) || !Number.isInteger(monthNum) || !Number.isInteger(yearNum)) return null;
  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1) return null;

  // days in month
  const mdays = [31, (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dayNum > mdays[monthNum - 1]) return null;

  // return ISO date YYYY-MM-DD
  return `${String(yearNum).padStart(4, "0")}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
}

export default function EmployeeForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    address: "",
    position: "",
    contact: "",
    dob: "", // user-visible DD-MM-YYYY
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
    // client-side validation
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
      // Validate required fields
      if (!form.first_name.trim() || !form.last_name.trim()) {
        throw new Error("First name and last name are required.");
      }

      // Validate and convert DOB if present
      let dobForServer = "";
      if (form.dob && form.dob.trim() !== "") {
        const iso = parseDDMMYYYY(form.dob);
        if (!iso) {
          throw new Error("DOB must be in DD-MM-YYYY format and a valid date.");
        }
        dobForServer = iso; // YYYY-MM-DD for backend storage/duplicates
      }

      const fd = new FormData();
      // append text fields; use dobForServer for dob
      Object.entries(form).forEach(([k, v]) => {
        if (k === "dob") fd.append(k, dobForServer || "");
        else fd.append(k, v || "");
      });

      // append photo if present (field name 'photo')
      if (photoFile) fd.append("photo", photoFile);

      const res = await fetch("http://localhost:4000/api/employees", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Server error");
      setResult(data);
      // keep form for next use; optionally clear fields:
      // setForm({ first_name:"", last_name:"", address:"", position:"", contact:"", dob:"", blood_group:"", email:"", dept:"", other:"" });
      // setPhotoFile(null);
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
        {/* DOB input expects DD-MM-YYYY */}
        <input placeholder="DOB (DD-MM-YYYY)" value={form.dob} onChange={e => update("dob", e.target.value)} />
        <input placeholder="Blood group" value={form.blood_group} onChange={e => update("blood_group", e.target.value)} />
        <input className="full" placeholder="Address" value={form.address} onChange={e => update("address", e.target.value)} />
        <input className="full" placeholder="Other" value={form.other} onChange={e => update("other", e.target.value)} />

        {/* Photo input (placed inside the form) */}
        <div className="photo-row">
          <label className="photo-label">Photo</label>
          <div className="photo-controls">
            <input type="file" accept="image/*" onChange={onPhotoChange} />
            {photoPreview && (
              <img src={photoPreview} alt="preview" className="preview-thumb" />
            )}
          </div>
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
                <img src={result.photoUrl} alt="employee" className="photo-thumb" />
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
