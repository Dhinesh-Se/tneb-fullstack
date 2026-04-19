import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../redux/slices/authSlice";

export default function GovHeader() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const role      = useSelector((s) => s.auth.role);
  const isAdmin   = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);
  const now = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const handleLogout = () => { dispatch(logout()); navigate("/login"); };
  const active = (path) => location.pathname === path ? "active" : "";

  return (
    <header className="gov-header">
      <div className="gov-topbar">
        <span>Government of Tamil Nadu &nbsp;|&nbsp; Electricity Board Consumer Portal</span>
        <span>{now}</span>
      </div>
      <nav className="gov-navbar">
        <div className="gov-brand" onClick={() => navigate(isAdmin ? "/" : isManager ? "/dashboard" : "/")}>
          <div className="gov-brand-logo">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="#1a3a6e" strokeWidth="2"/>
              <path d="M16 6 L18 13 L25 13 L19.5 17.5 L21.5 24.5 L16 20 L10.5 24.5 L12.5 17.5 L7 13 L14 13 Z" fill="#1a3a6e"/>
            </svg>
          </div>
          <div className="gov-brand-text">
            <strong>TNEB Consumer Portal</strong>
            <span>Tamil Nadu Electricity Board</span>
          </div>
        </div>

        {isLoggedIn && (
          <ul className="gov-nav-links">
            {isAdmin && <>
              <li><button className={`gov-nav-btn ${active("/")}`} onClick={() => navigate("/")}>🏠 <span>Home</span></button></li>
              <li><button className={`gov-nav-btn ${active("/consumer")}`} onClick={() => navigate("/consumer")}>👤 <span>Consumers</span></button></li>
              <li><button className={`gov-nav-btn ${active("/consumption")}`} onClick={() => navigate("/consumption")}>⚡ <span>Consumption</span></button></li>
            </>}
            {isManager && <>
              <li><button className={`gov-nav-btn ${active("/dashboard")}`} onClick={() => navigate("/dashboard")}>📊 <span>Dashboard</span></button></li>
              <li><button className={`gov-nav-btn ${active("/billing-calculator")}`} onClick={() => navigate("/billing-calculator")}>🧮 <span>Bill Calculator</span></button></li>
              <li><button className={`gov-nav-btn ${active("/billing-details")}`} onClick={() => navigate("/billing-details")}>📋 <span>Billing Details</span></button></li>
            </>}
            <li className="gov-nav-logout"><button onClick={handleLogout}>⬡ Sign Out</button></li>
          </ul>
        )}
      </nav>
    </header>
  );
}
