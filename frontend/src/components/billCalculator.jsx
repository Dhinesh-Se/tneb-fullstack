import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

const fmtCur = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default function BillCalculator() {
  const navigate = useNavigate();
  const [consumerType, setConsumerType] = useState("");
  const [units, setUnits]               = useState("");
  const [amount, setAmount]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState({});
  const [apiError, setApiError]         = useState("");

  const validate = () => {
    const e = {};
    if (!consumerType)              e.consumerType = "Please select a consumer type";
    if (!units)                     e.units        = "Units consumed is required";
    else if (isNaN(Number(units)) || Number(units) <= 0) e.units = "Enter a valid positive number";
    else if (Number(units) > 99999) e.units        = "Units value seems too high, please verify";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCalculate = async () => {
    setApiError("");
    if (!validate()) return;
    try {
      setLoading(true);
      setAmount(null);
      const res = await api.get(`/api/consumption/amount/TEMP?UnitsConsumed=${Number(units)}&ConsumerType=${consumerType}`);
      const extracted = typeof res.data === "number" ? res.data : res.data.amount ?? res.data.Amount ?? null;
      setAmount(extracted);
    } catch {
      setApiError("Failed to calculate bill. Please try again.");
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setConsumerType(""); setUnits(""); setAmount(null); setErrors({}); setApiError("");
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--gray-100)" }}>
      {/* Simple public header */}
      <header style={{ background:"var(--gov-blue)", padding:"0 28px" }}>
        <div style={{ background:"var(--gov-blue-dark)", padding:"5px 0", fontSize:11.5, color:"#c5d5f0" }}>
          Government of Tamil Nadu &nbsp;|&nbsp; Electricity Board Consumer Portal
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", minHeight:60 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, color:"#fff", cursor:"pointer" }} onClick={() => navigate("/")}>
            <div style={{ width:42, height:42, background:"#fff", borderRadius:"50%", display:"grid", placeItems:"center" }}>
              <svg viewBox="0 0 32 32" width="26" height="26"><circle cx="16" cy="16" r="14" stroke="#1a3a6e" strokeWidth="2" fill="none"/><path d="M16 5 L18.5 12 L26 12 L20 16.5 L22.5 24 L16 19.5 L9.5 24 L12 16.5 L6 12 L13.5 12 Z" fill="#1a3a6e"/></svg>
            </div>
            <div>
              <strong style={{ fontFamily:"'Source Serif 4',serif", fontSize:16, display:"block" }}>TNEB Consumer Portal</strong>
              <span style={{ fontSize:11.5, color:"#b8d0f0" }}>Tamil Nadu Electricity Board</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/billing-details")}>📋 Billing Details</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/login")}>🔐 Admin Login</button>
          </div>
        </div>
      </header>

      <div style={{ background:"var(--gray-200)", borderBottom:"1px solid var(--gray-300)", padding:"8px 28px", fontSize:12.5, color:"var(--gray-500)", display:"flex", gap:6 }}>
        <a style={{ color:"var(--gov-blue-mid)", cursor:"pointer" }} onClick={() => navigate("/")}>Home</a>
        <span>›</span><span>Bill Calculator</span>
      </div>

      <div style={{ padding:"32px 28px" }}>
        <div style={{ maxWidth:520, margin:"0 auto" }}>
          <div className="card">
            <div style={{ padding:"18px 22px", borderBottom:"3px solid var(--gov-blue)", background:"var(--gov-blue-light)", borderRadius:"8px 8px 0 0" }}>
              <h2 style={{ fontFamily:"'Source Serif 4',serif", fontSize:20, color:"var(--gov-blue)" }}>🧮 EB Bill Estimator</h2>
              <p style={{ fontSize:13, color:"var(--gray-500)", marginTop:4 }}>Calculate estimated electricity bill based on units consumed.</p>
            </div>
            <div style={{ padding:24 }}>
              {apiError && <div className="alert alert-error" style={{ marginBottom:18 }}><span>⚠</span> {apiError}</div>}

              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div className="form-group">
                  <label className="form-label">Consumer Type <span className="required">*</span></label>
                  <select
                    value={consumerType}
                    onChange={(e) => { setConsumerType(e.target.value); setErrors({...errors, consumerType:""}); setAmount(null); }}
                    className={`form-control${errors.consumerType ? " is-error" : ""}`}
                  >
                    <option value="">— Select Consumer Type —</option>
                    <option value="Domestic">Domestic</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                  {errors.consumerType && <span className="field-error">⚠ {errors.consumerType}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Units Consumed (kWh) <span className="required">*</span></label>
                  <input
                    type="number"
                    value={units}
                    min="1"
                    placeholder="e.g. 150"
                    onChange={(e) => { setUnits(e.target.value); setErrors({...errors, units:""}); setAmount(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
                    className={`form-control${errors.units ? " is-error" : ""}`}
                  />
                  {errors.units && <span className="field-error">⚠ {errors.units}</span>}
                </div>

                <div className="btn-row">
                  <button className="btn btn-primary" onClick={handleCalculate} disabled={loading} style={{ flex:1, justifyContent:"center" }}>
                    {loading ? "⌛ Calculating…" : "🧮 Calculate Bill"}
                  </button>
                  <button className="btn btn-secondary" onClick={handleReset}>↺ Reset</button>
                </div>
              </div>

              {/* Result */}
              {amount !== null && (
                <div style={{ marginTop:24, background:"var(--gov-blue)", borderRadius:8, padding:"20px 22px", color:"#fff", textAlign:"center" }}>
                  <div style={{ fontSize:13, color:"#b8d0f0", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Estimated Bill Amount</div>
                  <div style={{ fontSize:36, fontWeight:800, fontFamily:"'Source Serif 4',serif", letterSpacing:-1 }}>{fmtCur(amount)}</div>
                  <div style={{ fontSize:12.5, color:"#90b8e0", marginTop:8 }}>
                    {units} kWh × Rate per unit &nbsp;|&nbsp; {consumerType} consumer
                  </div>
                  <div style={{ marginTop:12, fontSize:11.5, color:"#7090c0", borderTop:"1px solid rgba(255,255,255,.15)", paddingTop:10 }}>
                    ⓘ This is an estimate only. Actual bill may vary based on applicable tariff slabs, taxes, and surcharges.
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="alert alert-info" style={{ marginTop:20 }}>
                <span>ⓘ</span>
                <div style={{ fontSize:12.5 }}>
                  For exact billing, visit the nearest TNEB office or check your official bill at the Billing Details section.
                  Tariff rates are subject to revision by TNERC.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
