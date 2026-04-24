import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import GovHeader from "./GovHeader";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getField(item, field) {
  if (!item) return "";
  const alt = field.charAt(0).toLowerCase() + field.slice(1);
  return item[field] ?? item[alt] ?? "";
}

function getCleanPhone(phone = "") {
  return phone.replace(/\D/g, "").slice(-10);
}

const EMPTY = { ConsumptionNo:"", ConsumerName:"", Address:"", Email:"", PhoneNumber:"", WardNo:"", ConsumerType:"" };

export default function Consumer() {
  const navigate = useNavigate();
  const [formData, setFormData]     = useState(EMPTY);
  const [errors, setErrors]         = useState({});
  const [backendData, setBackendData] = useState([]);
  const [isEditing, setIsEditing]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [searchConsumptionNo, setSearchConsumptionNo] = useState("");
  const [searchConsumerName, setSearchConsumerName]   = useState("");
  const [toast, setToast]           = useState(null);
  const [saving, setSaving]         = useState(false);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadConsumers = useCallback(async () => {
    try { const res = await api.get("/api/consumer"); setBackendData(res.data); }
    catch { showToast("Failed to load consumers", "error"); }
  }, []);
  useEffect(() => { loadConsumers(); }, [loadConsumers]);

  const validate = () => {
    const e = {};
    if (!formData.ConsumerName.trim())  e.ConsumerName  = "Consumer name is required";
    else if (formData.ConsumerName.trim().length < 3) e.ConsumerName = "Name must be at least 3 characters";
    if (!formData.Address.trim())       e.Address       = "Address is required";
    if (!formData.Email.trim())         e.Email         = "Email address is required";
    else if (!emailRx.test(formData.Email)) e.Email     = "Enter a valid email address";
    const digits = formData.PhoneNumber.replace(/\D/g,"");
    if (!digits)                        e.PhoneNumber   = "Phone number is required";
    else if (digits.length !== 10)      e.PhoneNumber   = "Phone number must be exactly 10 digits";
    else if (!/^[6-9]/.test(digits))    e.PhoneNumber   = "Phone number must start with 6-9";
    if (!formData.WardNo.trim())        e.WardNo        = "Ward number is required";
    if (!formData.ConsumerType)         e.ConsumerType  = "Consumer type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanPhone = getCleanPhone(formData.PhoneNumber);
      await api.post("/api/consumer", {
        ConsumptionNo: "", ConsumerName: formData.ConsumerName.trim(),
        Address: formData.Address.trim(), Email: formData.Email.trim(),
        PhoneNumber: cleanPhone, WardNo: formData.WardNo.trim(),
        ConsumerType: formData.ConsumerType,
      });
      showToast("Consumer registered successfully.");
      await loadConsumers();
      resetForm();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.response?.data?.title || error?.message || "Save failed";
      showToast(`Error: ${msg}`, "error");
    } finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    const cp = getCleanPhone(getField(item, "PhoneNumber"));
    setFormData({
      ConsumptionNo: getField(item, "ConsumptionNo"),
      ConsumerName:  getField(item, "ConsumerName"),
      Address:       getField(item, "Address"),
      Email:         getField(item, "Email"),
      PhoneNumber:   cp,
      WardNo:        getField(item, "WardNo"),
      ConsumerType:  getField(item, "ConsumerType"),
    });
    setEditId(getField(item, "ConsumptionNo"));
    setIsEditing(true);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanPhone = getCleanPhone(formData.PhoneNumber);
      await api.put(`/api/consumer/${editId}`, {
        ConsumptionNo: formData.ConsumptionNo, ConsumerName: formData.ConsumerName.trim(),
        Address: formData.Address.trim(), Email: formData.Email.trim(),
        PhoneNumber: cleanPhone, WardNo: formData.WardNo.trim(), ConsumerType: formData.ConsumerType,
      });
      showToast("Consumer updated successfully.");
      await loadConsumers();
      resetForm();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Update failed";
      showToast(`Error: ${msg}`, "error");
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setIsEditing(false); setEditId(null);
    setFormData(EMPTY); setErrors({});
  };

  const filteredData = backendData.filter((item) => {
    const no   = getField(item, "ConsumptionNo").toLowerCase();
    const name = getField(item, "ConsumerName").toLowerCase();
    return no.includes(searchConsumptionNo.toLowerCase()) && name.includes(searchConsumerName.toLowerCase());
  });

  const F = ({ name, label, placeholder, type="text", required }) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required"> *</span>}</label>
      <input
        name={name} type={type} value={formData[name]} onChange={handleChange}
        placeholder={placeholder}
        className={`form-control${errors[name] ? " is-error" : ""}`}
      />
      {errors[name] && <span className="field-error">⚠ {errors[name]}</span>}
    </div>
  );

  return (
    <div className="page-wrapper">
      <GovHeader />
      <div className="breadcrumb">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a><span className="sep">›</span>
        <span>Consumer Management</span>
      </div>
      <div className="page-title-bar">
        <h1>👤 Consumer Management</h1>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>← Back to Dashboard</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/consumption")}>⚡ Consumption</button>
        </div>
      </div>

      <div className="main-content">
        {/* Toast */}
        {toast && (
          <div className={`alert alert-${toast.type === "error" ? "error" : "success"}`} style={{ marginBottom:20 }}>
            <span>{toast.type === "error" ? "⚠" : "✓"}</span> {toast.msg}
          </div>
        )}

        {/* Form */}
        <div className="form-section mb-20">
          <div className="form-section-header">
            <h2>{isEditing ? "✏ Edit Consumer Record" : "➕ Register New Consumer"}</h2>
            {isEditing && <button className="btn btn-secondary btn-sm" onClick={resetForm}>✕ Cancel Edit</button>}
          </div>
          <div className="form-body">
            {isEditing && (
              <div className="form-group" style={{ marginBottom:16 }}>
                <label className="form-label">Consumption No</label>
                <input value={formData.ConsumptionNo} readOnly className="form-control" />
              </div>
            )}
            <div className="form-grid">
              <F name="ConsumerName" label="Consumer Name"    placeholder="Full name of consumer"      required />
              <F name="Address"      label="Address"          placeholder="Door no, street, locality"  required />
              <F name="Email"        label="Email Address"    placeholder="example@mail.com"            required type="email" />
              <div className="form-group">
                <label className="form-label">Mobile Number <span className="required">*</span></label>
                <div className="phone-group">
                  <span className="phone-prefix">+91</span>
                  <input
                    type="tel"
                    value={formData.PhoneNumber}
                    placeholder="10-digit mobile number"
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g,"").slice(0,10);
                      setFormData({ ...formData, PhoneNumber: d });
                      setErrors({ ...errors, PhoneNumber:"" });
                    }}
                    className={`form-control phone-input${errors.PhoneNumber ? " is-error" : ""}`}
                  />
                </div>
                {errors.PhoneNumber && <span className="field-error">⚠ {errors.PhoneNumber}</span>}
              </div>
              <F name="WardNo" label="Ward Number" placeholder="Ward / Zone number" required />
              <div className="form-group">
                <label className="form-label">Consumer Type <span className="required">*</span></label>
                <select name="ConsumerType" value={formData.ConsumerType} onChange={handleChange} className={`form-control${errors.ConsumerType ? " is-error" : ""}`}>
                  <option value="">— Select Type —</option>
                  <option value="Domestic">Domestic</option>
                  <option value="Commercial">Commercial</option>
                </select>
                {errors.ConsumerType && <span className="field-error">⚠ {errors.ConsumerType}</span>}
              </div>
            </div>
            <div className="btn-row" style={{ marginTop:20 }}>
              {isEditing ? (
                <>
                  <button className="btn btn-warning" onClick={handleUpdate} disabled={saving}>{saving ? "Updating…" : "💾 Update Record"}</button>
                  <button className="btn btn-secondary" onClick={resetForm}>✕ Cancel</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "💾 Register Consumer"}</button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3>Consumer Records ({filteredData.length})</h3>
            <div className="table-filters">
              <input placeholder="Search by Consumption No" value={searchConsumptionNo} onChange={(e) => setSearchConsumptionNo(e.target.value)} className="table-filter-input" />
              <input placeholder="Search by Name" value={searchConsumerName} onChange={(e) => setSearchConsumerName(e.target.value)} className="table-filter-input" />
            </div>
          </div>
          <div className="table-scroll">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Cons. No</th><th>Name</th><th>Address</th>
                  <th>Email</th><th>Phone</th><th>Ward</th><th>Type</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan="8" className="table-empty">No consumer records found.</td></tr>
                ) : filteredData.map((x, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-info">{getField(x,"ConsumptionNo")}</span></td>
                    <td style={{ fontWeight:500 }}>{getField(x,"ConsumerName")}</td>
                    <td style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{getField(x,"Address")}</td>
                    <td>{getField(x,"Email")}</td>
                    <td>{getField(x,"PhoneNumber")}</td>
                    <td>{getField(x,"WardNo")}</td>
                    <td><span className={`badge ${getField(x,"ConsumerType") === "Commercial" ? "badge-paid" : "badge-info"}`}>{getField(x,"ConsumerType")}</span></td>
                    <td><button className="btn btn-warning btn-sm" onClick={() => handleEdit(x)}>✏ Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
