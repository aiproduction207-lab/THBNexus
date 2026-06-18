import { useEffect, useMemo, useState } from "react"

function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [tradeLogs, setTradeLogs] = useState([])
  const [email, setEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("demo")
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalTrades: 0,
    activeBots: 0,
    totalPlatformProfit: 0,
    recentTrades: [],
    recentDeposits: [],
    recentWithdrawals: []
  })

  const fetchUsers = async () => {
    const res = await fetch("http://localhost:5000/api/admin/users")
    const data = await res.json()
    if (data.success) setUsers(data.users)
  }

  const fetchTradeLogs = async () => {
    const res = await fetch("http://localhost:5000/api/admin/trades")
    const data = await res.json()
    if (data.success) setTradeLogs(data.trades)
  }

  const fetchSummary = async () => {
    const res = await fetch("http://localhost:5000/api/admin/summary")
    const data = await res.json()
    if (data.success) setSummary(data.summary)
  }

  const creditUser = async () => {
    const res = await fetch("http://localhost:5000/api/admin/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount: Number(amount), type })
    })
    const data = await res.json()
    alert(data.message)
    fetchUsers()
    fetchSummary()
  }

  const deleteUser = async (targetEmail) => {
    const res = await fetch("http://localhost:5000/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail })
    })
    const data = await res.json()
    alert(data.message)
    fetchUsers()
    fetchTradeLogs()
    fetchSummary()
  }

  const toggleBlockUser = async (targetEmail, blocked) => {
    const res = await fetch("http://localhost:5000/api/admin/block-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, blocked: !blocked })
    })
    const data = await res.json()
    alert(data.message)
    fetchUsers()
    fetchSummary()
  }

  useEffect(() => {
    fetchUsers()
    fetchTradeLogs()
    fetchSummary()
    const interval = setInterval(() => {
      fetchUsers()
      fetchTradeLogs()
      fetchSummary()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const totalProfit = useMemo(() => {
    return summary.totalPlatformProfit || 0
  }, [summary])

  return (
    <div style={{ padding: 24, background: "#0b1220", minHeight: "100vh", color: "#e5eefc" }}>
      <h1 style={{ marginTop: 0 }}>Admin Control Center</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <StatCard label="Total Users" value={summary.totalUsers} accent="#3b82f6" />
        <StatCard label="Total Trades" value={summary.totalTrades} accent="#22c55e" />
        <StatCard label="Active Bots" value={summary.activeBots} accent="#f59e0b" />
        <StatCard label="Total Platform Profit" value={`$${totalProfit.toFixed(2)}`} accent={totalProfit >= 0 ? "#22c55e" : "#ef4444"} />
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Credit User</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User Email" style={inputStyle} />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" type="number" style={inputStyle} />
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="demo">Demo</option>
              <option value="real">Real</option>
            </select>
            <button onClick={creditUser} style={buttonStyle}>Credit Balance</button>
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Trades</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {summary.recentTrades.map((trade) => (
              <div key={trade.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1f2937", paddingBottom: 6 }}>
                <span>{trade.email}</span>
                <span style={{ color: Number(trade.profit || 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                  {trade.result} ${Number(trade.profit || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Deposits</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {summary.recentDeposits.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1f2937", paddingBottom: 6 }}>
                <span>{d.email}</span>
                <span>${Number(d.amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Recent Withdrawals</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {summary.recentWithdrawals.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1f2937", paddingBottom: 6 }}>
                <span>{w.email}</span>
                <span>${Number(w.amount || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, ...panelStyle }}>
        <h3 style={{ marginTop: 0 }}>User Management</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0b1220" }}>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Demo</th>
              <th style={thStyle}>Real</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>${Number(u.demo_balance || 0).toFixed(2)}</td>
                <td style={tdStyle}>${Number(u.real_balance || 0).toFixed(2)}</td>
                <td style={tdStyle}>{u.is_blocked ? "Blocked" : "Active"}</td>
                <td style={tdStyle}>
                  <button onClick={() => toggleBlockUser(u.email, u.is_blocked)} style={{ ...actionButton, background: u.is_blocked ? "#22c55e" : "#ef4444" }}>
                    {u.is_blocked ? "Unblock" : "Block"}
                  </button>
                  <button onClick={() => deleteUser(u.email)} style={{ ...actionButton, background: "#6b7280" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, ...panelStyle }}>
        <h3 style={{ marginTop: 0 }}>Trade Logs</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0b1220" }}>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Mode</th>
              <th style={thStyle}>Strategy</th>
              <th style={thStyle}>Result</th>
              <th style={thStyle}>Profit</th>
              <th style={thStyle}>Time</th>
            </tr>
          </thead>
          <tbody>
            {tradeLogs.map((t) => (
              <tr key={t.id}>
                <td style={tdStyle}>{t.email}</td>
                <td style={tdStyle}>{t.mode}</td>
                <td style={tdStyle}>{t.strategy || "SAFE"}</td>
                <td style={{ ...tdStyle, color: t.result === "WIN" ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{t.result}</td>
                <td style={{ ...tdStyle, color: Number(t.profit || 0) >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {Number(t.profit || 0) >= 0 ? "+" : ""}${Number(t.profit || 0).toFixed(2)}
                </td>
                <td style={tdStyle}>{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 18 }}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ color: accent, fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value}</div>
    </div>
  )
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "#0b1220",
  color: "#e5eefc",
  border: "1px solid #1f2937",
  minWidth: 180
}

const buttonStyle = {
  padding: "10px 16px",
  border: 0,
  borderRadius: 10,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

const actionButton = {
  padding: "6px 10px",
  marginRight: 6,
  border: 0,
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer"
}

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 18
}

const thStyle = { padding: 12, textAlign: "left" }
const tdStyle = { padding: 12, borderBottom: "1px solid #1f2937" }

export default AdminDashboard