import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/login";
import Home from "./components/home";
import Dashboard from "./components/dashboard";
import Consumer from "./components/consumer";
import Consumption from "./components/consumption";
import BillingDetails from "./components/billingDetails";
import BillCalculator from "./components/billCalculator";
import ProtectedRoute from "./protectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/billing-details" element={<BillingDetails />} />
        <Route path="/billing-calculator" element={<BillCalculator />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consumer"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <Consumer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consumption"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <Consumption />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;