import { useState, useEffect } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import GovHeader from "./GovHeader";

const RATE_PER_UNIT = 5;
function getField(item, field) {
  if (!item) return "";
  const alt = field.charAt(0).toLowerCase() + field.slice(1);
  return item[field] ?? item[alt] ?? "";
}
function getValidDate(d) {
  if (!d) return "";
  if (d.startsWith("0001") || d.startsWith("1001")) return "";
  return d.split("T")[0];
}
function normDate(d) {
  if (!d) return "";
  const p = new Date(d);
  return isNaN(p) ? "" : p.toISOString().split("T")[0];
}

export default function Consumption() {
  const navigate = useNavigate();
  const [formData, setFormData]   = useState({ ConsumptionNo:"", UnitsConsumed:"", BillDate:"", PaymentStatus:"UNPAID", Amount:"" });
  const [errors, setErrors]       = useState({});
  const [backendData, setBackendData] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [consumptionNumbers, setConsumptionNumbers] = useState([]);
  const [filters, setFilters]     = useState({ consumptionNo:"", name:"" });
  const [toast, setToast]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [payingId, setPayingId]   = useState(null);

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const loadData = async () => {
    const res     = await api.get("/api/consumption");
    const consRes = await api.get("/api/consumer");
    setBackendData(res.data || []);
    setConsumers(consRes.data || []);
    setConsumptionNumbers([...new Set((consRes.data||[]).map(x => getField(x,"ConsumptionNo")))].filter(Boolean));
  };
  useEffect(() => { loadData(); }, []);

  const allData = (backendData).map((x) => ({
    _id: x._id,
    ConsumptionNo: x.ConsumptionNo || x.consumptionNo,
    UnitsConsumed: x.UnitsConsumed || x.unitsConsumed,
    BillDate: getValidDate(x.BillDate || x.billDate || x.RecordedDate || x.recordedDate),
    PaymentStatus: (x.PaymentStatus || x.paymentStatus || "").trim().toUpperCase(),
    Amount: x.Amount || x.amount,
  }));

  const latestData = Object.values(
    allData.reduce((acc, item) => {
      const k = item.ConsumptionNo || "";
      if (!k) return acc;
      if (!acc[k] || new Date(item.BillDate) > new Date(acc[k].BillDate)) acc[k] = item;
      return acc;
    }, {})
  );

  const filteredData = latestData.filter((item) => {
    const consumer = consumers.find((c) => getField(c,"ConsumptionNo") === item.ConsumptionNo);
    const name = consumer ? getField(consumer,"ConsumerName") : "";
    return (!filters.consumptionNo || item.ConsumptionNo.includes(filters.consumptionNo)) &&
           (!filters.name || name.toLowerCase().includes(filters.name.toLowerCase()));
  });

  const getLatestBillDate = (no) => {
    const rows = allData.filter(x => x.ConsumptionNo === no && x.BillDate).sort((a,b) => new Date(b.BillDate)-new Date(a.BillDate));
    return rows.length > 0 ? new Date(rows[0].BillDate) : null;
  };

  const validate = () => {
    const e = {};
    if (!formData.ConsumptionNo)    e.ConsumptionNo   = "Please select a Consumption Number";
    if (!formData.UnitsConsumed)    e.UnitsConsumed   = "Units consumed is required";
    else if (isNaN(Number(formData.UnitsConsumed)) || Number(formData.UnitsConsumed) <= 0)
                                    e.UnitsConsumed   = "Enter a valid positive number";
    else if (Number(formData.UnitsConsumed) > 99999) e.UnitsConsumed = "Units seem too high, please verify";
    if (!formData.BillDate)         e.BillDate        = "Bill date is required";
    else {
      const normalizedDate = normDate(formData.BillDate);
      if (!normalizedDate)          e.BillDate        = "Enter a valid date";
      else {
        const today   = new Date(); today.setHours(0,0,0,0);
        const selDate = new Date(normalizedDate);
        if (selDate > today)        e.BillDate        = "Bill date cannot be in the future";
        else {
          const latest = getLatestBillDate(formData.ConsumptionNo);
          if (latest) {
            if (selDate <= latest)  e.BillDate        = "Bill date must be later than the last bill date";
            else {
              const days = Math.floor((selDate - latest) / 86400000);
              if (days < 60)        e.BillDate        = `Next bill can only be generated after 60 days (${60-days} day(s) remaining)`;
            }
          }
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const normalizedDate = normDate(formData.BillDate);
    try {
      await api.post("/api/consumption", {
        consumptionNo: formData.ConsumptionNo,
        unitsConsumed: Number(formData.UnitsConsumed),
        billDate: normalizedDate,
        paymentStatus: "UNPAID"
      });
      showToast("Bill generated successfully.");
      setFormData({ ConsumptionNo:"", UnitsConsumed:"", BillDate:"", PaymentStatus:"UNPAID", Amount:"" });
      setErrors({});
      await loadData();
    } catch (error) {
      showToast(error.response?.data?.message || error.message || "Bill generation failed", "error");
    } finally { setSaving(false); }
  };

  const handlePay = async (row) => {
    if (payingId === row._id) return;
    if (!window.confirm(`Confirm payment for Consumption No: ${row.ConsumptionNo}?\nAmount: ₹${row.Amount}`)) return;
    setPayingId(row._id);
    try {
      await api.patch(`/api/consumption/${row._id}/pay`, {});
      showToast(`Payment of ₹${row.Amount} recorded successfully.`);
      await loadData();
    } catch (error) {
      showToast(error.response?.data?.message || "Payment update failed", "error");
    } finally { setPayingId(null); }
  };

  const previewAmt = formData.UnitsConsumed && !isNaN(Number(formData.UnitsConsumed)) && Number(formData.UnitsConsumed) > 0
    ? Number(formData.UnitsConsumed) * RATE_PER_UNIT : null;

  const getConsumerName = (no) => {
    const c = consumers.find(x => getField(x,"ConsumptionNo") === no);
    return c ? getField(c,"ConsumerName") : "-";
  };

  return (
    <div className="page-wrapper">
      <GovHeader />
      <div className="breadcrumb">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a><span className="sep">›</span>
        <span>Consumption Management</span>
      </div>
      <div className="page-title-bar">
        <h1>⚡ Consumption Management</h1>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>← Dashboard</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/consumer")}>👤 Consumers</button>
        </div>
      </div>

      <div className="main-content">
        {toast && (
          <div className={`alert alert-${toast.type === "error" ? "error" : "success"}`} style={{ marginBottom:20 }}>
            <span>{toast.type === "error" ? "⚠" : "✓"}</span> {toast.msg}
          </div>
        )}

        {/* Bill Generation Form */}
        <div className="form-section mb-20">
          <div className="form-section-header">
            <h2>📄 Generate New Bill</h2>
            {previewAmt !== null && (
              <div style={{ background:"var(--gov-blue)", color:"#fff", padding:"5px 14px", borderRadius:20, fontSize:13.5, fontWeight:600 }}>
                Estimated Amount: ₹{previewAmt.toLocaleString("en-IN")} (@ ₹{RATE_PER_UNIT}/unit)
              </div>
            )}
          </div>
          <div className="form-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Consumption Number <span className="required">*</span></label>
                <select name="ConsumptionNo" value={formData.ConsumptionNo}
                  onChange={(e) => { setFormData({...formData, ConsumptionNo:e.target.value}); setErrors({...errors, ConsumptionNo:""}); }}
                  className={`form-control${errors.ConsumptionNo ? " is-error" : ""}`}>
                  <option value="">— Select Consumption No —</option>
                  {consumptionNumbers.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                {errors.ConsumptionNo && <span className="field-error">⚠ {errors.ConsumptionNo}</span>}
                {formData.ConsumptionNo && (
                  <span style={{ fontSize:12, color:"var(--gray-500)", marginTop:3 }}>
                    Consumer: {getConsumerName(formData.ConsumptionNo)}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Units Consumed (kWh) <span className="required">*</span></label>
                <input type="number" name="UnitsConsumed" value={formData.UnitsConsumed} min="1"
                  placeholder="e.g. 150"
                  onChange={(e) => { setFormData({...formData, UnitsConsumed:e.target.value}); setErrors({...errors, UnitsConsumed:""}); }}
                  className={`form-control${errors.UnitsConsumed ? " is-error" : ""}`}
                />
                {errors.UnitsConsumed && <span className="field-error">⚠ {errors.UnitsConsumed}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Bill Date <span className="required">*</span></label>
                <input type="date" name="BillDate" value={formData.BillDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => { setFormData({...formData, BillDate:e.target.value}); setErrors({...errors, BillDate:""}); }}
                  className={`form-control${errors.BillDate ? " is-error" : ""}`}
                />
                {errors.BillDate && <span className="field-error">⚠ {errors.BillDate}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <input value="UNPAID" readOnly className="form-control" />
                <span style={{ fontSize:11.5, color:"var(--gray-500)" }}>Status is auto-set to UNPAID on generation</span>
              </div>
            </div>

            <div className="btn-row" style={{ marginTop:20 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Generating…" : "📄 Generate Bill"}</button>
              <button className="btn btn-secondary" onClick={() => { setFormData({ ConsumptionNo:"", UnitsConsumed:"", BillDate:"", PaymentStatus:"UNPAID", Amount:"" }); setErrors({}); }}>↺ Reset</button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="table-wrapper">
          <div className="table-header">
            <h3>Consumption Records — Latest Bill per Consumer ({filteredData.length})</h3>
            <div className="table-filters">
              <input placeholder="Filter by Consumption No" value={filters.consumptionNo}
                onChange={(e) => setFilters({...filters, consumptionNo:e.target.value})} className="table-filter-input" />
              <input placeholder="Filter by Consumer Name" value={filters.name}
                onChange={(e) => setFilters({...filters, name:e.target.value})} className="table-filter-input" />
            </div>
          </div>
          <div className="table-scroll">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Cons. No</th><th>Consumer Name</th><th>Units (kWh)</th>
                  <th>Bill Date</th><th>Amount (₹)</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan="7" className="table-empty">No consumption records found.</td></tr>
                ) : filteredData.map((x, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-info">{x.ConsumptionNo}</span></td>
                    <td style={{ fontWeight:500 }}>{getConsumerName(x.ConsumptionNo)}</td>
                    <td>{x.UnitsConsumed} kWh</td>
                    <td>{x.BillDate || "-"}</td>
                    <td style={{ fontWeight:600 }}>₹{Number(x.Amount).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`badge badge-${x.PaymentStatus === "PAID" ? "paid" : "unpaid"}`}>
                        {x.PaymentStatus === "PAID" ? "✓ PAID" : "✗ UNPAID"}
                      </span>
                    </td>
                    <td>
                      {x.PaymentStatus === "UNPAID" && (
                        <button className="btn btn-success btn-sm" onClick={() => handlePay(x)} disabled={payingId === x.ConsumptionNo}>
                          {payingId === x.ConsumptionNo ? "Processing…" : "💳 Pay Bill"}
                        </button>
                      )}
                      {x.PaymentStatus === "PAID" && <span style={{ color:"var(--gray-400)", fontSize:12.5 }}>— Settled —</span>}
                    </td>
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
