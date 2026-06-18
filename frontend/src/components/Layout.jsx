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
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b1220", color: "#e5eefc" }}>
      <aside style={sidebarStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #3b82f6, #22c55e)", display: "grid", placeItems: "center", fontWeight: 800 }}>
              T
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Trading Desk</div>
              <div style={{ fontWeight: 700 }}>THB Nexus</div>
            </div>
          </div>
          <nav style={{ display: "grid", gap: 8 }}>
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => (item.action ? item.action() : navigate(item.path))}
                style={{
                  textAlign: "left",
                  background: location.pathname === item.path ? "#0f172a" : "transparent",
                  color: location.pathname === item.path ? "#fff" : "#9fb3d1",
                  border: location.pathname === item.path ? "1px solid #1e40af" : "1px solid transparent",
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "hidden" }}>
        <header style={headerStyle}>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>{user?.name || "User"}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{user?.email || ""}</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: "linear-gradient(90deg, #22c55e, #3b82f6)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <section style={{ padding: 18 }}>{children}</section>
      </main>
    </div>
  )
}

const sidebarStyle = {
  width: 270,
  background: "#0f172a",
  color: "#e2e8f0",
  padding: 18,
  borderRight: "1px solid #1e293b",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
}

const headerStyle = {
  background: "#0b1220",
  borderBottom: "1px solid #1e293b",
  padding: "14px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
}