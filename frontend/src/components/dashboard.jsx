import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchConsumers } from "../redux/slices/consumerSlice";
import { fetchConsumption } from "../redux/slices/consumptionSlice";
import { api } from "../api";
import {
  Line, Bar, Doughnut
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import GovHeader from "./GovHeader";

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

/* ── helpers ── */
const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const toN    = (v) => Number(v || 0);
const norm   = (x) => (x?.paymentStatus ?? x?.PaymentStatus ?? "").toString().trim().toLowerCase();
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n);

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const consumers  = useSelector((s) => s.consumers.list);
  const consumptionList = useSelector((s) => s.consumption.list);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    dispatch(fetchConsumers());
    dispatch(fetchConsumption());
    // Try to get pre-aggregated stats from backend
    api.get("/api/consumption/stats/summary")
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [dispatch]);

  /* ── METRICS (computed from Redux store as fallback) ── */
  const totalUsers    = consumers.length;
  const paidRecs      = consumptionList.filter((x) => norm(x) === "paid");
  const unpaidRecs    = consumptionList.filter((x) => norm(x) === "unpaid");
  const paidAmt       = stats?.paidAmount   ?? paidRecs.reduce((s, x) => s + toN(x.amount), 0);
  const unpaidAmt     = stats?.unpaidAmount ?? unpaidRecs.reduce((s, x) => s + toN(x.amount), 0);
  const totalAmt      = paidAmt + unpaidAmt;
  const totalUnits    = stats?.totalUnits   ?? consumptionList.reduce((s, x) => s + toN(x.unitsConsumed), 0);
  const paidCount     = stats?.paidCount    ?? paidRecs.length;
  const unpaidCount   = stats?.unpaidCount  ?? unpaidRecs.length;
  const totalConsumers = stats?.totalConsumers ?? totalUsers;
  const collRate      = totalAmt === 0 ? 0 : ((paidAmt / totalAmt) * 100).toFixed(1);

  /* ── CHART DATA from Redux store ── */
  // Consumer type distribution
  const typeMap = {};
  consumers.forEach((c) => {
    const t = c.consumerType || c.ConsumerType || "Domestic";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });

  // Monthly from stats API or compute locally
  let mLabels = [], mUnits = [], mAmounts = [], mCounts = [];
  if (stats?.monthly?.length) {
    mLabels  = stats.monthly.map((m) => m.label);
    mUnits   = stats.monthly.map((m) => m.units);
    mAmounts = stats.monthly.map((m) => m.revenue);
    mCounts  = stats.monthly.map((m) => m.count);
  } else {
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
    mLabels  = Object.keys(monthMap).slice(-8);
    mUnits   = mLabels.map((m) => monthMap[m].units);
    mAmounts = mLabels.map((m) => monthMap[m].amount);
    mCounts  = mLabels.map((m) => monthMap[m].count);
  }

  // Ward-wise consumer count
  const wardMap = {};
  consumers.forEach((c) => {
    const w = c.wardNo || c.WardNo || "Unknown";
    wardMap[w] = (wardMap[w] || 0) + 1;
  });
  const wardLabels = Object.keys(wardMap).sort();
  const wardData   = wardLabels.map((w) => wardMap[w]);

  /* ── CHART CONFIGS ── */
  const gridColor = "rgba(255,255,255,0.07)";
  const tickColor = "#94a3b8";

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ₹${fmtNum(c.parsed.y)}` } } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 }, callback: (v) => `₹${(v/1000).toFixed(0)}k` }, beginAtZero: true }
    }
  };

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } }, beginAtZero: true }
    }
  };

  const donutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: "72%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#cbd5e1", boxWidth: 10, padding: 16, font: { size: 12 } } }
    }
  };

  const dateStr = currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const STAT_CARDS = [
    {
      label: "Total Consumers",
      value: fmtNum(totalConsumers),
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
      value: fmtNum(paidCount),
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
      value: fmtNum(unpaidCount),
      sub: fmt(unpaidAmt) + " outstanding",
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
      value: fmt(paidAmt),
      sub: `of ${fmt(totalAmt)} billed`,
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
          <span style={{ color: "#94a3b8" }}>Manager Dashboard</span>
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
              Analytics Dashboard
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
              Tamil Nadu Electricity Board — Consumer Billing Overview
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
            { id: "revenue",  label: "Revenue & Units" },
            { id: "consumers",label: "Consumer Analysis" },
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
            { icon: "🧮", label: "Bill Calculator",  sub: "Estimate electricity bills",    path: "/billing-calculator", color: "#3b82f6" },
            { icon: "📋", label: "Billing Details",   sub: "View consumer payment history", path: "/billing-details",   color: "#22c55e" },
          ].map((c) => (
            <div
              key={c.path}
              onClick={() => navigate(c.path)}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.07)`,
                borderLeft: `3px solid ${c.color}`,
                borderRadius: 10,
                padding: "16px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "background 0.2s, transform 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.sub}</div>
              </div>
              <svg style={{ marginLeft: "auto", color: "#334155" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>

        {/* ── KPI stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
          {STAT_CARDS.map((s) => (
            <div
              key={s.label}
              style={{
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "20px 22px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* accent glow */}
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 90, height: 90, borderRadius: "50%",
                background: s.accent, opacity: 0.08, filter: "blur(20px)",
              }}/>
              <div style={{
                width: 46, height: 46, borderRadius: 10,
                background: s.bg,
                color: s.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ══════════════ OVERVIEW TAB ══════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Collection progress + Financial summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Financial summary card */}
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Financial Summary
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Total Billed",    value: fmt(totalAmt),  color: "#e2e8f0" },
                    { label: "Collected",        value: fmt(paidAmt),   color: "#22c55e" },
                    { label: "Outstanding",      value: fmt(unpaidAmt), color: "#f59e0b" },
                    { label: "Total Units (kWh)", value: fmtNum(Math.round(totalUnits)), color: "#38bdf8" },
                  ].map((row) => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "#64748b" }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                {/* Collection Rate bar */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    <span>Collection Rate</span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{collRate}%</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${collRate}%`, background: "linear-gradient(90deg,#16a34a,#22c55e)", borderRadius: 99, transition: "width 1s ease" }}/>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#334155", marginTop: 5 }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>

              {/* Payment status doughnut */}
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Payment Status
                </h3>
                <div style={{ height: 220 }}>
                  <Doughnut
                    data={{
                      labels: [`Collected — ${fmt(paidAmt)}`, `Pending — ${fmt(unpaidAmt)}`],
                      datasets: [{
                        data: [paidAmt || 1, unpaidAmt || 0],
                        backgroundColor: ["#22c55e", "#f59e0b"],
                        borderColor: ["#0a0f1e"],
                        borderWidth: 3,
                        hoverOffset: 6,
                      }]
                    }}
                    options={donutOpts}
                  />
                </div>
              </div>
            </div>

            {/* Revenue line chart */}
            {mLabels.length > 0 && (
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Monthly Revenue Trend
                  </h3>
                  <span style={{ fontSize: 12, color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 10px" }}>
                    Last {mLabels.length} months
                  </span>
                </div>
                <div style={{ height: 240 }}>
                  <Line
                    data={{
                      labels: mLabels,
                      datasets: [{
                        data: mAmounts,
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59,130,246,0.08)",
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: "#3b82f6",
                        pointRadius: 4,
                        pointHoverRadius: 7,
                      }]
                    }}
                    options={lineOpts}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════ REVENUE TAB ══════════════ */}
        {activeTab === "revenue" && mLabels.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Monthly Revenue Bar */}
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Monthly Revenue (₹)
                </h3>
                <div style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: mLabels,
                      datasets: [{
                        label: "Revenue",
                        data: mAmounts,
                        backgroundColor: mAmounts.map((_, i) => i === mAmounts.length - 1 ? "#3b82f6" : "rgba(59,130,246,0.4)"),
                        borderRadius: 5,
                        borderSkipped: false,
                      }]
                    }}
                    options={{ ...barOpts, plugins: { ...barOpts.plugins, tooltip: { callbacks: { label: (c) => ` ₹${fmtNum(c.parsed.y)}` } } } }}
                  />
                </div>
              </div>

              {/* Monthly Units */}
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Monthly Units Consumed (kWh)
                </h3>
                <div style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: mLabels,
                      datasets: [{
                        data: mUnits,
                        backgroundColor: "rgba(6,182,212,0.5)",
                        borderColor: "#06b6d4",
                        borderWidth: 1.5,
                        borderRadius: 5,
                        borderSkipped: false,
                      }]
                    }}
                    options={{ ...barOpts, plugins: { ...barOpts.plugins, tooltip: { callbacks: { label: (c) => ` ${fmtNum(c.parsed.y)} kWh` } } } }}
                  />
                </div>
              </div>
            </div>

            {/* Revenue + Units combo line chart */}
            <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                Revenue vs Bill Count
              </h3>
              <div style={{ height: 260 }}>
                <Line
                  data={{
                    labels: mLabels,
                    datasets: [
                      {
                        label: "Revenue (₹)",
                        data: mAmounts,
                        borderColor: "#a855f7",
                        backgroundColor: "rgba(168,85,247,0.07)",
                        fill: true, tension: 0.4, borderWidth: 2.5,
                        pointBackgroundColor: "#a855f7", pointRadius: 4,
                        yAxisID: "y",
                      },
                      {
                        label: "Bills Issued",
                        data: mCounts,
                        borderColor: "#22c55e",
                        backgroundColor: "rgba(34,197,94,0.07)",
                        fill: false, tension: 0.4, borderWidth: 2,
                        borderDash: [5, 3],
                        pointBackgroundColor: "#22c55e", pointRadius: 4,
                        yAxisID: "y1",
                      },
                    ]
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true, labels: { color: "#94a3b8", boxWidth: 10, font: { size: 12 } } }
                    },
                    scales: {
                      x: { grid: { color: gridColor }, ticks: { color: tickColor } },
                      y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: (v) => `₹${(v/1000).toFixed(0)}k` }, beginAtZero: true, position: "left" },
                      y1: { grid: { display: false }, ticks: { color: "#22c55e" }, beginAtZero: true, position: "right" }
                    }
                  }}
                />
              </div>
            </div>

            {/* Payment split row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Payment Split (by Count)
                </h3>
                <div style={{ height: 200 }}>
                  <Doughnut
                    data={{
                      labels: [`Paid (${fmtNum(paidCount)})`, `Unpaid (${fmtNum(unpaidCount)})`],
                      datasets: [{ data: [paidCount || 1, unpaidCount || 0], backgroundColor: ["#3b82f6","#f59e0b"], borderColor: ["#0a0f1e"], borderWidth: 3 }]
                    }}
                    options={donutOpts}
                  />
                </div>
              </div>
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Payment Split (by Amount)
                </h3>
                <div style={{ height: 200 }}>
                  <Doughnut
                    data={{
                      labels: [`Collected — ${fmt(paidAmt)}`, `Pending — ${fmt(unpaidAmt)}`],
                      datasets: [{ data: [paidAmt || 1, unpaidAmt || 0], backgroundColor: ["#22c55e","#ef4444"], borderColor: ["#0a0f1e"], borderWidth: 3 }]
                    }}
                    options={donutOpts}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════ CONSUMER ANALYSIS TAB ══════════════ */}
        {activeTab === "consumers" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Consumer Type Distribution */}
              {Object.keys(typeMap).length > 0 && (
                <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                  <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Consumer Type Distribution
                  </h3>
                  <div style={{ height: 260 }}>
                    <Bar
                      data={{
                        labels: Object.keys(typeMap),
                        datasets: [{
                          data: Object.values(typeMap),
                          backgroundColor: ["rgba(59,130,246,0.7)","rgba(34,197,94,0.7)","rgba(245,158,11,0.7)","rgba(168,85,247,0.7)"],
                          borderColor: ["#3b82f6","#22c55e","#f59e0b","#a855f7"],
                          borderWidth: 1.5,
                          borderRadius: 6,
                          borderSkipped: false,
                        }]
                      }}
                      options={{ ...barOpts, plugins: { ...barOpts.plugins, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y} consumers` } } } }}
                    />
                  </div>
                </div>
              )}

              {/* Consumer type donut */}
              {Object.keys(typeMap).length > 0 && (
                <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
                  <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Type Breakdown
                  </h3>
                  <div style={{ height: 260 }}>
                    <Doughnut
                      data={{
                        labels: Object.keys(typeMap),
                        datasets: [{
                          data: Object.values(typeMap),
                          backgroundColor: ["rgba(59,130,246,0.8)","rgba(34,197,94,0.8)","rgba(245,158,11,0.8)","rgba(168,85,247,0.8)"],
                          borderColor: ["#0a0f1e"], borderWidth: 3,
                        }]
                      }}
                      options={donutOpts}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Ward-wise bar */}
            {wardLabels.length > 0 && (
              <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  Consumers by Ward
                </h3>
                <div style={{ height: 240 }}>
                  <Bar
                    data={{
                      labels: wardLabels,
                      datasets: [{
                        data: wardData,
                        backgroundColor: "rgba(6,182,212,0.5)",
                        borderColor: "#06b6d4",
                        borderWidth: 1.5,
                        borderRadius: 5,
                        borderSkipped: false,
                      }]
                    }}
                    options={{ ...barOpts, plugins: { ...barOpts.plugins, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y} consumers` } } } }}
                  />
                </div>
              </div>
            )}

            {/* Summary table */}
            <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "22px 24px" }}>
              <h3 style={{ margin: "0 0 18px", color: "#e2e8f0", fontSize: 14, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                Consumer Type Summary
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Type", "Count", "% Share"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(typeMap).map(([type, count], i) => (
                    <tr key={type} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 14px", color: "#e2e8f0", fontSize: 13.5 }}>{type}</td>
                      <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 13.5 }}>{fmtNum(count)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13.5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99 }}>
                            <div style={{
                              height: "100%",
                              width: `${(count / totalConsumers * 100).toFixed(0)}%`,
                              background: ["#3b82f6","#22c55e","#f59e0b","#a855f7"][i % 4],
                              borderRadius: 99,
                            }}/>
                          </div>
                          <span style={{ color: "#94a3b8", minWidth: 36, textAlign: "right" }}>
                            {totalConsumers > 0 ? (count / totalConsumers * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* empty-state if no data yet */}
        {!loading && consumptionList.length === 0 && consumers.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#64748b" }}>No data available yet</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Add consumers and consumption records to see analytics here.</div>
          </div>
        )}
      </div>
    </div>
  );
}
