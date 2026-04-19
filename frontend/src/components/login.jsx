import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { loginSuccess } from "../redux/slices/authSlice";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData]       = useState({ adminId: "", password: "" });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!data.adminId.trim())  e.adminId  = "User ID is required";
    if (!data.password)        e.password = "Password is required";
    else if (data.password.length < 4) e.password = "Password must be at least 4 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setApiError("");
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await api.post("/api/auth/login", { adminId: data.adminId, password: data.password });
      const role = String(res.data.role || "").toUpperCase();
      localStorage.setItem("token",  res.data.token);
      localStorage.setItem("role",   role);
      localStorage.setItem("userId", data.adminId);
      dispatch(loginSuccess({ token: res.data.token, role, userId: data.adminId }));
      navigate(role === "MANAGER" ? "/dashboard" : "/");
    } catch {
      setApiError("Invalid credentials. Please check your User ID and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

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

      {/* Login Box */}
      <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 20px 50px rgba(0,0,0,.35)", padding: "32px 36px", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, color: "#1a3a6e", fontWeight: 700 }}>Authorised User Login</h2>
          <div style={{ width: 48, height: 3, background: "#1a3a6e", margin: "8px auto 0", borderRadius: 2 }} />
        </div>

        {apiError && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            <span>⚠</span> {apiError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">User ID <span className="required">*</span></label>
            <input
              name="adminId"
              value={data.adminId}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter your user ID"
              autoComplete="username"
              className={`form-control${errors.adminId ? " is-error" : ""}`}
            />
            {errors.adminId && <span className="field-error">⚠ {errors.adminId}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="required">*</span></label>
            <input
              name="password"
              type="password"
              value={data.password}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`form-control${errors.password ? " is-error" : ""}`}
            />
            {errors.password && <span className="field-error">⚠ {errors.password}</span>}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "11px", marginTop: 4, fontSize: 14 }}
          >
            {loading ? "⌛ Authenticating…" : "🔐 Login to Portal"}
          </button>
        </div>

        {/* Public links */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/billing-details")}>📋 Billing Details</button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/billing-calculator")}>🧮 Bill Calculator</button>
        </div>
      </div>

      <p style={{ color: "#7090c0", fontSize: 12, marginTop: 20, textAlign: "center" }}>
        © {new Date().getFullYear()} Tamil Nadu Electricity Board. All rights reserved.
      </p>
    </div>
  );
}
