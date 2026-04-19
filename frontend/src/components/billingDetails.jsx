import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

const maskText  = (v="", n=3) => !v ? "-" : v.length <= n ? v : v.slice(0,n) + "•".repeat(v.length - n);
const maskPhone = (p="") => !p ? "-" : p.slice(0,5) + "•".repeat(Math.max(0, p.length-5));
const toN       = (v) => Number(v || 0);
const fmtDate   = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "-"; };
const fmtCur    = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const getStatus = (bill) => (bill.paymentStatus ?? bill.PaymentStatus ?? "").toString().trim().toUpperCase();

export default function BillingDetails() {
  const navigate = useNavigate();
  const [search, setSearch]     = useState("");
  const [searchErr, setSearchErr] = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) { setSearchErr("Please enter a Consumption Number"); return; }
    setSearchErr("");
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        api.get(`/api/consumer/${search.trim()}`),
        api.get(`/api/consumption/by-number/${search.trim()}`),
      ]);
      setResult({ consumer: cRes.data, consumption: bRes.data || [] });
    } catch {
      setSearchErr("No records found for this Consumption Number. Please verify and try again.");
      setResult(null);
    } finally { setLoading(false); }
  };

  const c          = result?.consumer;
  const bills      = result?.consumption || [];
  const unpaidBills  = bills.filter(b => getStatus(b) === "UNPAID");
  const unpaidTotal  = unpaidBills.reduce((s,b) => s + toN(b.amount || b.Amount), 0);

  return (
    <div style={{ minHeight:"100vh", background:"var(--gray-100)", display:"flex", flexDirection:"column" }}>
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
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/billing-calculator")}>🧮 Bill Calculator</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/login")}>🔐 Admin Login</button>
          </div>
        </div>
      </header>

      <div style={{ background:"var(--gray-200)", borderBottom:"1px solid var(--gray-300)", padding:"8px 28px", fontSize:12.5, color:"var(--gray-500)", display:"flex", gap:6 }}>
        <a style={{ color:"var(--gov-blue-mid)", cursor:"pointer" }} onClick={() => navigate("/")}>Home</a>
        <span>›</span><span>Billing Details</span>
      </div>

      <div style={{ padding:"24px 28px" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          {/* Search Card */}
          <div className="card mb-20" style={{ marginBottom:24 }}>
            <div style={{ padding:"16px 20px", borderBottom:"3px solid var(--gov-blue)", background:"var(--gov-blue-light)", borderRadius:"8px 8px 0 0" }}>
              <h2 style={{ fontFamily:"'Source Serif 4',serif", fontSize:18, color:"var(--gov-blue)" }}>📋 Consumer Billing Details</h2>
              <p style={{ fontSize:13, color:"var(--gray-500)", marginTop:4 }}>Enter your Consumption Number to view your billing history.</p>
            </div>
            <div style={{ padding:20 }}>
              {searchErr && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠</span> {searchErr}</div>}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter Consumption Number (e.g. EB-001)"
                  className={`form-control${searchErr ? " is-error" : ""}`}
                  style={{ flex:1, minWidth:200 }}
                />
                <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                  {loading ? "⌛ Searching…" : "🔍 Search"}
                </button>
              </div>
              <p style={{ fontSize:12, color:"var(--gray-400)", marginTop:8 }}>
                ⓘ For privacy protection, certain personal details are partially masked.
              </p>
            </div>
          </div>

          {/* Result */}
          {result && (
            <>
              {/* Consumer Info */}
              <div className="card mb-20" style={{ marginBottom:20 }}>
                <div className="card-header"><h3>👤 Consumer Information</h3><span className="badge badge-info">{c?.ConsumptionNo || c?.consumptionNo}</span></div>
                <div className="card-body">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"10px 20px" }}>
                    {[
                      ["Consumption No",  c?.ConsumptionNo || c?.consumptionNo],
                      ["Consumer Name",   maskText(c?.ConsumerName || c?.consumerName, 3)],
                      ["Address",         maskText(c?.Address || c?.address, 4)],
                      ["Email",           maskText(c?.Email || c?.email, 4)],
                      ["Phone",           maskPhone(c?.PhoneNumber || c?.phoneNumber)],
                      ["Consumer Type",   c?.ConsumerType || c?.consumerType],
                    ].map(([k,v]) => (
                      <div key={k} style={{ borderBottom:"1px solid var(--gray-100)", padding:"8px 0" }}>
                        <div style={{ fontSize:11.5, color:"var(--gray-500)", textTransform:"uppercase", letterSpacing:.4, fontWeight:600 }}>{k}</div>
                        <div style={{ fontWeight:600, color:"var(--gray-800)", marginTop:3 }}>{v || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bills Table */}
              <div className="table-wrapper" style={{ marginBottom:20 }}>
                <div className="table-header"><h3>⚡ Billing History ({bills.length} records)</h3></div>
                <div className="table-scroll">
                  <table className="gov-table">
                    <thead>
                      <tr><th>Bill Date</th><th>Units (kWh)</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {bills.length === 0 ? (
                        <tr><td colSpan="4" className="table-empty">No billing records found.</td></tr>
                      ) : bills.map((bill, i) => {
                        const status = getStatus(bill);
                        return (
                          <tr key={i}>
                            <td>{fmtDate(bill.recordedDate)}</td>
                            <td>{bill.unitsConsumed} kWh</td>
                            <td style={{ fontWeight:600 }}>{fmtCur(bill.amount)}</td>
                            <td><span className={`badge badge-${status === "PAID" ? "paid" : "unpaid"}`}>{status === "PAID" ? "✓ Paid" : "✗ Unpaid"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Banner */}
              {unpaidBills.length > 0 ? (
                <div className="alert alert-error" style={{ fontSize:14 }}>
                  <span style={{ fontSize:20 }}>⚠</span>
                  <div>
                    <strong>Pending Dues Found</strong><br/>
                    You have <strong>{unpaidBills.length}</strong> unpaid bill(s) totalling <strong>{fmtCur(unpaidTotal)}</strong>.
                    Please visit the nearest TNEB office or pay online to avoid disconnection.
                  </div>
                </div>
              ) : (
                <div className="alert alert-success" style={{ fontSize:14 }}>
                  <span style={{ fontSize:20 }}>✓</span>
                  <div><strong>All Bills Settled</strong> — Your account is up to date. No pending dues.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
