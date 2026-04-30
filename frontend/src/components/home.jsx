import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Title,Tooltip,Legend, Filler} from "chart.js";
import { fetchConsumers } from "../redux/slices/consumerSlice";
import { fetchConsumption } from "../redux/slices/consumptionSlice";
import { api } from "../api";
import GovHeader from "./GovHeader";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* ── helpers ── */
const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const toN    = (v) => Number(v || 0);
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n);

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const consumers = useSelector((state) => state.consumers.list);
  const consumptionList = useSelector((state) => state.consumption.list);

  const [searchConsumptionNo, setSearchConsumptionNo] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ adminId: "", password: "", role: "ADMIN" });
  const [registerMessage, setRegisterMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchConsumers());
      dispatch(fetchConsumption());
    }
  }, [isLoggedIn, dispatch]);

  const normalizeStatus = (x) => x?.paymentStatus?.toString().trim().toLowerCase();
  const formatDate = (value) => {
    const d = value ? new Date(value) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
  };
  const toNumber = (v) => Number(v || 0);

  const totalUsers = consumers.length;
  const paidRecords = consumptionList.filter((x) => normalizeStatus(x) === "paid");
  const unpaidRecords = consumptionList.filter((x) => normalizeStatus(x) === "unpaid");
  const paidUsers = paidRecords.length;
  const unpaidUsers = unpaidRecords.length;
  const totalPaidAmount = paidRecords.reduce((s, x) => s + toNumber(x.amount), 0);
  const totalUnpaidAmount = unpaidRecords.reduce((s, x) => s + toNumber(x.amount), 0);
  const totalAmount = totalPaidAmount + totalUnpaidAmount;
  const totalUnits = consumptionList.reduce((s, x) => s + toNumber(x.unitsConsumed), 0);
  const collRate = totalAmount === 0 ? 0 : ((totalPaidAmount / totalAmount) * 100).toFixed(1);

  const handleAddUserChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
    setRegisterMessage("");
  };

  const handleRegisterUser = async () => {
    if (!newUser.adminId || !newUser.password || !newUser.role) {
      setRegisterMessage("Please fill all fields.");
      return;
    }

    try {
      await api.post("/api/auth/register", {
        AdminId: newUser.adminId,
        Password: newUser.password,
        Role: newUser.role,
      });
      setRegisterMessage("User created successfully.");
      setNewUser({ adminId: "", password: "", role: "ADMIN" });
      setShowAddUserForm(false);
    } catch (err) {
      console.error(err);
      setRegisterMessage("Failed to create user. Please try again.");
    }
  };

  const handleSearch = async () => {
    if (!searchConsumptionNo.trim()) return alert("Please enter a valid Consumption No");
    try {
      const consumerRes = await api.get(`/api/consumer/${searchConsumptionNo.trim()}`);
      const consumptionRes = await api.get(`/api/consumption/by-number/${searchConsumptionNo.trim()}`);
      setSearchResult({ consumer: consumerRes.data, consumption: consumptionRes.data });
    } catch {
      alert("No data found");
      setSearchResult(null);
    }
  };

  /* ── CHART CONFIGS ── */
  const gridColor = "rgba(255,255,255,0.07)";
  const tickColor = "#94a3b8";

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } }, beginAtZero: true }
    }
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ₹${fmtNum(c.parsed.y)}` } } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 }, callback: (v) => `₹${(v/1000).toFixed(0)}k` }, beginAtZero: true }
    }
  };

  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: "72%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#cbd5e1", boxWidth: 10, padding: 16, font: { size: 12 } } }
    }
  };
  
  // Consumer type distribution
  const typeMap = {};
  consumers.forEach((c) => {
    const t = c.consumerType || c.ConsumerType || "Domestic";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });
  const typeLabels = Object.keys(typeMap);
  const typeData = typeLabels.map((t) => typeMap[t]);

  // Monthly trend
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthMap = {};
  consumptionList.forEach((c) => {
    const d = c.recordedDate || c.billDate || c.BillDate;
    const dt = d ? new Date(d) : null;
    if (dt && !isNaN(dt)) {
      const k = `${MONTH_NAMES[dt.getMonth()]} '${String(dt.getFullYear()).slice(-2)}`;
      if (!monthMap[k]) monthMap[k] = { units: 0, amount: 0, count: 0 };
      monthMap[k].units  += toN(c.unitsConsumed);
      monthMap[k].amount += toN(c.amount);
      monthMap[k].count  += 1;
    }
  });
  const monthLabels = Object.keys(monthMap).slice(-8);
  const monthUnits = monthLabels.map((m) => monthMap[m].units);
  const monthAmounts = monthLabels.map((m) => monthMap[m].amount);

  // Ward-wise consumer count
  const wardMap = {};
  consumers.forEach((c) => {
    const w = c.wardNo || c.WardNo || "Unknown";
    wardMap[w] = (wardMap[w] || 0) + 1;
  });

  const dateStr = currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const STAT_CARDS = [
    {
      label: "Total Consumers",
      value: fmtNum(totalUsers),
      sub: "Registered accounts",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      accent: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
    },
    {
      label: "Bills Collected",
      value: fmtNum(paidUsers),
      sub: `Collection rate ${collRate}%`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
      accent: "#22c55e",
      bg: "rgba(34,197,94,0.12)",
    },
    {
      label: "Pending Bills",
      value: fmtNum(unpaidUsers),
      sub: fmt(totalUnpaidAmount) + " outstanding",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      accent: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
    },
    {
      label: "Revenue Collected",
      value: fmt(totalPaidAmount),
      sub: `of ${fmt(totalAmount)} billed`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      accent: "#a855f7",
      bg: "rgba(168,85,247,0.12)",
    },
    {
      label: "Units Consumed",
      value: `${fmtNum(Math.round(totalUnits))} kWh`,
      sub: "Total electricity usage",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      accent: "#06b6d4",
      bg: "rgba(6,182,212,0.12)",
    },
  ];

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0d2855 0%, #1a3a6e 55%, #2456a4 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        {/* Gov Banner */}
        <div style={{ textAlign: "center", color: "#fff", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: "#fff", borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <svg viewBox="0 0 32 32" width="40" height="40">
              <circle cx="16" cy="16" r="14" stroke="#1a3a6e" strokeWidth="2" fill="none"/>
              <path d="M16 5 L18.5 12 L26 12 L20 16.5 L22.5 24 L16 19.5 L9.5 24 L12 16.5 L6 12 L13.5 12 Z" fill="#1a3a6e"/>
            </svg>
          </div>
          <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 700, letterSpacing: .3 }}>Tamil Nadu Electricity Board</div>
          <div style={{ fontSize: 13, color: "#b8d0f0", marginTop: 4, letterSpacing: .4 }}>Consumer Billing Management System</div>
        </div>

        {/* Search Box */}
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 20px 50px rgba(0,0,0,.35)", padding: "32px 36px", width: "100%", maxWidth: 500 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, color: "#1a3a6e", fontWeight: 700 }}>Check Your Bill</h2>
            <div style={{ width: 48, height: 3, background: "#1a3a6e", margin: "8px auto 0", borderRadius: 2 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              placeholder="Enter Consumption Number"
              value={searchConsumptionNo}
              onChange={(e) => setSearchConsumptionNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: 14, fontFamily: "inherit" }}
            />
            <button
              onClick={handleSearch}
              style={{ padding: "12px", backgroundColor: "#1a3a6e", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#0d2855"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#1a3a6e"}
            >
              Search Bill →
            </button>
          </div>

          {searchResult && (
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "6px" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#334155" }}>Consumer Info</h4>
                  <div style={{ display: "grid", gap: "6px 0", fontSize: 13 }}>
                    <div><span style={{ color: "#64748b" }}>Name:</span> <strong>{searchResult.consumer?.consumerName || "-"}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Address:</span> <strong>{searchResult.consumer?.address || "-"}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Type:</span> <strong>{searchResult.consumer?.consumerType || "-"}</strong></div>
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "6px" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#334155" }}>Summary</h4>
                  <div style={{ display: "grid", gap: "6px 0", fontSize: 13 }}>
                    <div><span style={{ color: "#64748b" }}>Records:</span> <strong>{Array.isArray(searchResult.consumption) ? searchResult.consumption.length : 0}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Latest:</span> <strong>{formatDate(Array.isArray(searchResult.consumption) ? searchResult.consumption[0]?.recordedDate : null)}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Total:</span> <strong>₹{Array.isArray(searchResult.consumption) ? searchResult.consumption.reduce((sum, item) => sum + toNumber(item.amount), 0) : 0}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => navigate("/login")}
            style={{ padding: "12px 28px", backgroundColor: "#fff", color: "#1a3a6e", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "15px", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            Admin/Manager Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <GovHeader />

      {/* ── Page header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 32px",
      }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 14, fontSize: 12, color: "#64748b" }}>
          <span>Portal</span>
          <span style={{ color: "#334155" }}>›</span>
          <span style={{ color: "#94a3b8" }}>Admin Dashboard</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "12px 0 20px" }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: "#f1f5f9",
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
            }}>
              Admin Console
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
              Tamil Nadu Electricity Board — Consumer Management
            </p>
          </div>
          {/* Live clock */}
          <div style={{
            textAlign: "right",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: "10px 18px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>
              {timeStr}
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{dateStr}</div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "management", label: "User Management" },
            { id: "analytics", label: "Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "rgba(59,130,246,0.15)" : "transparent",
                color: activeTab === tab.id ? "#60a5fa" : "#64748b",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
                padding: "10px 20px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "6px 6px 0 0",
                transition: "all 0.2s",
                letterSpacing: 0.3,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Quick-action cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 28 }}>
          {[
            { icon: "👤", label: "Manage Consumers",  sub: "Add/Edit consumer data",    path: "/consumer", color: "#3b82f6" },
            { icon: "📝", label: "Record Consumption", sub: "Log energy consumption",     path: "/consumption", color: "#22c55e" },
            { icon: "🧮", label: "Bill Calculator",   sub: "Estimate electricity bills", path: "/billing-calculator", color: "#f59e0b" },
          ].map((c) => (
            <div
              key={c.path}
              onClick={() => navigate(c.path)}
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "18px 20px",
                cursor: "pointer",
                transition: "all 0.25s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)";
                e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
              <h3 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 600, color: "#f1f5f9" }}>{c.label}</h3>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16, marginBottom: 32 }}>
          {STAT_CARDS.map((card, i) => (
            <div
              key={i}
              style={{
                background: card.bg,
                border: `1px solid ${card.accent}40`,
                borderRadius: 12,
                padding: "22px 20px",
                borderLeft: `4px solid ${card.accent}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#94a3b8", fontWeight: 500 }}>{card.label}</p>
                  <h3 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#f1f5f9" }}>{card.value}</h3>
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{card.sub}</p>
                </div>
                <div style={{ color: card.accent, opacity: 0.8 }}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Charts Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              {/* Payment Status */}
              <div style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 24,
              }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Payment Status</h3>
                <div style={{ position: "relative", height: 280 }}>
                  <Doughnut
                    data={{
                      labels: ["Paid", "Unpaid"],
                      datasets: [{
                        data: [totalPaidAmount || 1, totalUnpaidAmount || 0],
                        backgroundColor: ["#22c55e", "#ef4444"],
                        borderColor: ["#1ea34f", "#d62828"],
                        borderWidth: 2,
                      }],
                    }}
                    options={donutOpts}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: 16, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>
                    <span style={{ color: "#94a3b8" }}>Collection Rate</span> <span style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>{collRate}%</span>
                  </p>
                </div>
              </div>

              {/* Consumer Distribution */}
              <div style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 24,
              }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Consumer Split</h3>
                <div style={{ position: "relative", height: 280 }}>
                  <Doughnut
                    data={{
                      labels: [`Paid (${paidUsers})`, `Unpaid (${unpaidUsers})`],
                      datasets: [{
                        data: [paidUsers || 1, unpaidUsers || 0],
                        backgroundColor: ["#3b82f6", "#f59e0b"],
                        borderColor: ["#1d4ed8", "#d97706"],
                        borderWidth: 2,
                      }],
                    }}
                    options={donutOpts}
                  />
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            {typeLabels.length > 0 && (
              <div style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 24,
                marginBottom: 32,
              }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Consumer Types</h3>
                <div style={{ position: "relative", height: 300 }}>
                  <Bar
                    data={{
                      labels: typeLabels,
                      datasets: [{
                        label: "Count",
                        data: typeData,
                        backgroundColor: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"],
                        borderColor: ["#1d4ed8", "#16a34a", "#d97706", "#dc2626"],
                        borderWidth: 2,
                        borderRadius: 8,
                      }],
                    }}
                    options={barOpts}
                  />
                </div>
              </div>
            )}

            {/* Monthly Trends */}
            {monthLabels.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20, marginBottom: 32 }}>
                <div style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 24,
                }}>
                  <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Units Consumed</h3>
                  <div style={{ position: "relative", height: 280 }}>
                    <Bar
                      data={{
                        labels: monthLabels,
                        datasets: [{
                          label: "kWh",
                          data: monthUnits,
                          backgroundColor: "#3b82f6",
                          borderColor: "#1d4ed8",
                          borderWidth: 2,
                          borderRadius: 6,
                        }],
                      }}
                      options={barOpts}
                    />
                  </div>
                </div>

                <div style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 24,
                }}>
                  <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Revenue Trend</h3>
                  <div style={{ position: "relative", height: 280 }}>
                    <Line
                      data={{
                        labels: monthLabels,
                        datasets: [{
                          label: "₹",
                          data: monthAmounts,
                          borderColor: "#22c55e",
                          backgroundColor: "rgba(34,197,94,0.15)",
                          borderWidth: 3,
                          tension: 0.4,
                          fill: true,
                          pointBackgroundColor: "#22c55e",
                          pointBorderColor: "#fff",
                          pointBorderWidth: 2,
                          pointRadius: 5,
                        }],
                      }}
                      options={lineOpts}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Management Tab */}
        {activeTab === "management" && (
          <div style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 28,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>⚡ Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button
                    onClick={() => navigate("/consumer")}
                    style={{
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      transition: "all 0.25s",
                    }}
                    onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                    onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                  >
                    👤 Manage Consumers
                  </button>
                  <button
                    onClick={() => navigate("/consumption")}
                    style={{
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      transition: "all 0.25s",
                    }}
                    onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                    onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                  >
                    📝 Record Consumption
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                    style={{
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      transition: "all 0.25s",
                    }}
                    onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
                    onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
                  >
                    ➕ Add User
                  </button>
                </div>
              </div>

              {showAddUserForm && (
                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: 20,
                }}>
                  <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>Create New User</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input
                      name="adminId"
                      value={newUser.adminId}
                      onChange={handleAddUserChange}
                      placeholder="User ID"
                      style={{ padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#f1f5f9", fontSize: 13 }}
                    />
                    <input
                      name="password"
                      type="password"
                      value={newUser.password}
                      onChange={handleAddUserChange}
                      placeholder="Password"
                      style={{ padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#f1f5f9", fontSize: 13 }}
                    />
                    <select
                      name="role"
                      value={newUser.role}
                      onChange={handleAddUserChange}
                      style={{ padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#f1f5f9", fontSize: 13 }}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                    {registerMessage && (
                      <div style={{ fontSize: 13, color: registerMessage.includes("success") ? "#22c55e" : "#ef4444", padding: "10px", background: registerMessage.includes("success") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", borderRadius: 6 }}>
                        {registerMessage}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={handleRegisterUser}
                        style={{ flex: 1, padding: "10px", background: "#22c55e", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => { setShowAddUserForm(false); setRegisterMessage(""); }}
                        style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.1)", color: "#cbd5e1", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 28,
          }}>
            <h3 style={{ margin: "0 0 24px", fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>📊 Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 16,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Total Billed</p>
                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{fmt(totalAmount)}</h4>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 16,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Pending Amount</p>
                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{fmt(totalUnpaidAmount)}</h4>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 16,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Total Units</p>
                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{fmtNum(Math.round(totalUnits))} kWh</h4>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: 16,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Collection Rate</p>
                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{collRate}%</h4>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
