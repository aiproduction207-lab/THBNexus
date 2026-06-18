import { BrowserRouter, Routes, Route } from "react-router-dom"

import ErrorBoundary from "./components/ErrorBoundary"
import Login from "./pages/Login"
import Register from "./pages/Register"
import VerifyOTP from "./pages/VerifyOTP"

import Dashboard from "./pages/Dashboard"
import Deposit from "./pages/Deposit"
import Withdraw from "./pages/Withdraw"
import TradeHistory from "./pages/TradeHistory"
import Profile from "./pages/Profile"
import KYC from "./pages/KYC"
import BotActivation from "./pages/BotActivation"

import AdminDashboard from "./admin/AdminDashboard"

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/trade-history" element={<TradeHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/kyc" element={<KYC />} />
          <Route path="/bot" element={<BotActivation />} />

          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App