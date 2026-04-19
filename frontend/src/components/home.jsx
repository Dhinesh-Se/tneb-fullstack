import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale,LinearScale,PointElement,LineElement,BarElement,ArcElement,Title,Tooltip,Legend,} from "chart.js";
import { fetchConsumers } from "../redux/slices/consumerSlice";
import { fetchConsumption } from "../redux/slices/consumptionSlice";
import { logout } from "../redux/slices/authSlice";
import { api } from "../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);                                // useSelector  => read data from redux store

export default function Home() {
  const dispatch = useDispatch();     // send action yo redux store
  const navigate = useNavigate();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const userRole = useSelector((state) => state.auth.role);
  const consumers = useSelector((state) => state.consumers.list);
  const consumptionList = useSelector((state) => state.consumption.list);
  const isAdmin = userRole === "ADMIN";

  const [searchConsumptionNo, setSearchConsumptionNo] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ adminId: "", password: "", role: "ADMIN" });
  const [registerMessage, setRegisterMessage] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchConsumers());
      dispatch(fetchConsumption());
    }
  }, [isLoggedIn, dispatch]);

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

  const handleLogout = () => { dispatch(logout()); navigate("/login"); };

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
      await api.post("/api/login/register", {
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

  const formatCurrency = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  // Prepare chart data
  const paymentRatio = totalAmount === 0 ? 0 : (totalPaidAmount / totalAmount) * 100;
  
  // Consumer type distribution
  const typeMap = {};
  consumers.forEach((c) => {
    const type = c.consumerType || "Domestic";
    typeMap[type] = (typeMap[type] || 0) + 1;
  });
  const typeLabels = Object.keys(typeMap);
  const typeData = typeLabels.map((t) => typeMap[t]);

  // Monthly trend
  const monthMap = {};
  consumptionList.forEach((c) => {
    const date = c.recordedDate ? new Date(c.recordedDate) : null;
    if (date && !isNaN(date)) {
      const month = date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!monthMap[month]) monthMap[month] = { units: 0, amount: 0, count: 0 };
      monthMap[month].units += toNumber(c.unitsConsumed);
      monthMap[month].amount += toNumber(c.amount);
      monthMap[month].count += 1;
    }
  });
  const monthLabels = Object.keys(monthMap).slice(-6);
  const monthUnits = monthLabels.map((m) => monthMap[m].units);
  const monthAmounts = monthLabels.map((m) => monthMap[m].amount);

  if (!isLoggedIn) {
    return (

      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>EB Billing Portal</h1>
          <p style={{ color: "#666" }}>Electricity Board Consumer Management System</p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2>Check Your Bill</h2>
          <p>Enter your Consumption Number to view bill details</p>

          <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
            <input
              placeholder="Enter Consumption Number"
              value={searchConsumptionNo}
              onChange={(e) => setSearchConsumptionNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
            <button
              onClick={handleSearch}
              style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              Search
            </button>
            <button onClick={() => navigate("/BillCalculator")}>Bill Calculator</button>

            
          </div>
          

          {searchResult && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "4px" }}>
                  <h3>Consumer Info</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 10px", marginTop: "10px" }}>
                    <span>Name:</span><strong>{searchResult.consumer?.consumerName || "-"}</strong>
                    <span>Address:</span><strong>{searchResult.consumer?.address || "-"}</strong>
                    <span>Phone Number:</span><strong>{searchResult.consumer?.PhoneNumber || "-"}</strong>
                    <span>Type:</span><strong>{searchResult.consumer?.consumerType || "-"}</strong>
                    <span>Consumption No:</span><strong>{searchResult.consumer?.consumptionNo || searchConsumptionNo.trim()}</strong>
                  </div>
                </div>

                <div style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "4px" }}>
                  <h3>Summary</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 10px", marginTop: "10px" }}>
                    <span>Records:</span><strong>{Array.isArray(searchResult.consumption) ? searchResult.consumption.length : 0}</strong>
                    <span>Latest Date:</span><strong>{formatDate(Array.isArray(searchResult.consumption) ? searchResult.consumption[0]?.recordedDate : null)}</strong>
                    <span>Total Amount:</span><strong>₹{Array.isArray(searchResult.consumption) ? searchResult.consumption.reduce((sum, item) => sum + toNumber(item.amount), 0) : 0}</strong>
                  </div>
                </div>
              </div>

              <h3>Bill History</h3>
              <div style={{ overflowX: "auto", marginTop: "10px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                      <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Units</th>
                      <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Amount</th>
                      <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(searchResult.consumption) && searchResult.consumption.length > 0 ? (
                      searchResult.consumption.map((item) => (
                        <tr key={item.id}>
                          <td style={{ padding: "10px", border: "1px solid #ddd" }}>{formatDate(item.recordedDate)}</td>
                          <td style={{ padding: "10px", border: "1px solid #ddd" }}>{item.unitsConsumed ?? "-"} kWh</td>
                          <td style={{ padding: "10px", border: "1px solid #ddd" }}>₹{item.amount ?? "-"}</td>
                          <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              backgroundColor: normalizeStatus(item) === "paid" ? "#d4edda" : "#f8d7da",
                              color: normalizeStatus(item) === "paid" ? "#155724" : "#721c24"
                            }}>
                              {item.paymentStatus?.toString().trim() || "-"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>No consumption records found for this number.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => navigate("/login")}
            style={{ padding: "12px 24px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}
          >
            Admin Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Navbar */}
      <nav style={{ backgroundColor: "#343a40", color: "white", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", cursor: "pointer" }} onClick={() => navigate("/")}>
          <span style={{ fontSize: "28px" }}>⚡</span>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>EB Billing Portal</h2>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {isAdmin && (<>
            <button onClick={() => navigate("/consumer")} style={{ backgroundColor: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "14px", padding: "5px 10px" }}>👤 Consumers</button>
            <button onClick={() => navigate("/consumption")} style={{ backgroundColor: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "14px", padding: "5px 10px" }}>⚡ Consumption</button>
          </>)}
          <button onClick={() => navigate("/")} style={{ backgroundColor: "transparent", color: "white", border: "none", cursor: "pointer", fontSize: "14px", padding: "5px 10px" }}>📊 Dashboard</button>
          <button onClick={handleLogout} style={{ backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", padding: "8px 16px", cursor: "pointer", fontSize: "14px" }}>🚪 Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ margin: "10px 0", color: "#333" }}>{isAdmin ? "Admin" : "Manager"} Dashboard</h1>
          <p style={{ color: "#666", margin: "5px 0" }}>Welcome back! Here's your billing overview.</p>
        </div>

        {/* Key Metrics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", textAlign: "center", backgroundColor: "white" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>👥</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>{totalUsers}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Total Consumers</div>
          </div>

          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", textAlign: "center", backgroundColor: "white" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>✅</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>{paidUsers}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Paid Users</div>
          </div>

          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", textAlign: "center", backgroundColor: "white" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>⚠️</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>{unpaidUsers}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Unpaid Users</div>
          </div>

          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", textAlign: "center", backgroundColor: "white" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>💰</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffc107" }}>{formatCurrency(totalPaidAmount)}</div>
            <div style={{ color: "#666", marginTop: "5px" }}>Revenue</div>
          </div>
        </div>

        {/* Quick Actions and Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>⚡ Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isAdmin && (<>
                <button
                  onClick={() => navigate("/consumer")}
                  style={{ padding: "12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontWeight: "bold", transition: "background 0.3s" }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
                >
                  👤 Add/Edit Consumer
                </button>
                <button
                  onClick={() => navigate("/consumption")}
                  style={{ padding: "12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontWeight: "bold", transition: "background 0.3s" }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
                >
                  📝 Record Consumption
                </button>
                <button
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  style={{ padding: "12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "15px", fontWeight: "bold", transition: "background 0.3s" }}
                  onMouseOver={(e) => e.target.style.backgroundColor = "#117a8b"}
                  onMouseOut={(e) => e.target.style.backgroundColor = "#17a2b8"}
                >
                  ➕ Add Admin / Manager
                </button>
              </>)}
              {!isAdmin && <p style={{ color: "#666", fontStyle: "italic" }}>Manager View - Dashboard Only</p>}
            </div>
          </div>
          {isAdmin && showAddUserForm && (
            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>Add Admin / Manager</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
                <input
                  name="adminId"
                  value={newUser.adminId}
                  onChange={handleAddUserChange}
                  placeholder="ID"
                  style={{ padding: "12px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
                <input
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={handleAddUserChange}
                  placeholder="Password"
                  style={{ padding: "12px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleAddUserChange}
                  style={{ padding: "12px", border: "1px solid #ccc", borderRadius: "4px" }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
                {registerMessage && <div style={{ color: registerMessage.includes("success") ? "#28a745" : "#dc3545" }}>{registerMessage}</div>}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleRegisterUser}
                    style={{ padding: "12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    Create User
                  </button>
                  <button
                    onClick={() => { setShowAddUserForm(false); setRegisterMessage(""); }}
                    style={{ padding: "12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333" }}>📊 Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 15px" }}>
              <span style={{ color: "#666" }}>Total Billed:</span>
              <span style={{ fontWeight: "bold", color: "#333" }}>{formatCurrency(totalAmount)}</span>

              <span style={{ color: "#666" }}>Pending Amount:</span>
              <span style={{ fontWeight: "bold", color: "#dc3545" }}>{formatCurrency(totalUnpaidAmount)}</span>

              <span style={{ color: "#666" }}>Total Units:</span>
              <span style={{ fontWeight: "bold", color: "#333" }}>{totalUnits.toLocaleString()} kWh</span>

              <span style={{ color: "#666" }}>Collection Rate:</span>
              <span style={{ fontWeight: "bold", color: "#28a745" }}>{totalAmount === 0 ? 0 : ((totalPaidAmount / totalAmount) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          {/* Payment Status Doughnut */}
          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Payment Status Distribution</h3>
            <div style={{ position: "relative", height: "250px" }}>
              <Doughnut
                data={{
                  labels: ["Paid", "Unpaid"],
                  datasets: [
                    {
                      data: [totalPaidAmount || 1, totalUnpaidAmount || 0],
                      backgroundColor: ["#28a745", "#dc3545"],
                      borderColor: ["#20c997", "#c82333"],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                    tooltip: { callbacks: { label: (context) => `₹${context.parsed}` } },
                  },
                }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: "15px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
              <p style={{ margin: "5px 0" }}>
                <strong>Collection Rate:</strong> {paymentRatio.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* User Payment Split */}
          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>User Payment Split</h3>
            <div style={{ position: "relative", height: "250px" }}>
              <Doughnut
                data={{
                  labels: [`Paid (${paidUsers})`, `Unpaid (${unpaidUsers})`],
                  datasets: [
                    {
                      data: [paidUsers || 1, unpaidUsers || 0],
                      backgroundColor: ["#007bff", "#ffc107"],
                      borderColor: ["#0056b3", "#e0a800"],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", marginBottom: "30px" }}>
          {/* Consumer Type Distribution */}
          {typeLabels.length > 0 && (
            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Consumer Type Distribution</h3>
              <div style={{ position: "relative", height: "250px" }}>
                <Bar
                  data={{
                    labels: typeLabels,
                    datasets: [
                      {
                        label: "Count",
                        data: typeData,
                        backgroundColor: ["#007bff", "#28a745", "#dc3545"],
                        borderColor: ["#0056b3", "#20c997", "#c82333"],
                        borderWidth: 2,
                        borderRadius: 5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true }, title: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Monthly Trend Charts */}
        {monthLabels.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Units Consumed</h3>
              <div style={{ position: "relative", height: "300px" }}>
                <Bar
                  data={{
                    labels: monthLabels,
                    datasets: [
                      {
                        label: "Units Consumed (kWh)",
                        data: monthUnits,
                        backgroundColor: "#007bff",
                        borderColor: "#0056b3",
                        borderWidth: 2,
                        borderRadius: 5,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true }, title: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "white" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px" }}>Revenue </h3>
              <div style={{ position: "relative", height: "300px" }}>
                <Line
                  data={{
                    labels: monthLabels,
                    datasets: [
                      {
                        label: "Revenue (₹)",
                        data: monthAmounts,
                        borderColor: "#28a745",
                        backgroundColor: "rgba(40, 167, 69, 0.15)",
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: true },
                      tooltip: {
                        callbacks: {
                          label: (context) => `₹${context.parsed.y}`,
                        },
                      },
                    },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
