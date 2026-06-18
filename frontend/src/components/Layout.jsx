import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
    if (!stored) {
      navigate("/")
      return
    }
    setUser(stored)
  }, [navigate])

  const logout = () => {
    localStorage.removeItem("thb_user")
    localStorage.removeItem("thb_role")
    navigate("/")
  }

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Bot Activation", path: "/bot" },
    { label: "Deposit", path: "/deposit" },
    { label: "Withdraw", path: "/withdraw" },
    { label: "Trade History", path: "/trade-history" },
    { label: "Profile", path: "/profile" },
    { label: "KYC", path: "/kyc" },
    { label: "Logout", action: logout }
  ]

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <aside style={{ width: 260, background: "#0f172a", color: "#e2e8f0", padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>THB Nexus</h2>
        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => (item.action ? item.action() : navigate(item.path))}
              style={{
                textAlign: "left",
                background: location.pathname === item.path ? "#1e293b" : "transparent",
                color: "#e2e8f0",
                border: 0,
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer"
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1 }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>{user?.name || "User"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{user?.email || ""}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #0ea5e9)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <section>{children}</section>
      </main>
    </div>
  )
}