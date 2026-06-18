import { useEffect, useMemo, useState } from "react"
import Layout from "../components/Layout"

export default function Dashboard() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [wallet, setWallet] = useState({ demo_balance: 0, real_balance: 0 })
  const [trades, setTrades] = useState([])

  const loadWallet = async () => {
    if (!email) return
    const res = await fetch("http://localhost:5000/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (data.success) {
      setWallet({
        demo_balance: Number(data.demo_balance || 0),
        real_balance: Number(data.real_balance || 0)
      })
    }
  }

  const loadTrades = async () => {
    if (!email) return
    const res = await fetch("http://localhost:5000/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (data.success) setTrades(data.trades || [])
  }

  useEffect(() => {
    loadWallet()
    loadTrades()
    const walletInterval = setInterval(loadWallet, 3000)
    const tradeInterval = setInterval(loadTrades, 3000)
    return () => {
      clearInterval(walletInterval)
      clearInterval(tradeInterval)
    }
  }, [email])

  const stats = useMemo(() => {
    const total = trades.length
    const wins = trades.filter((t) => t.result === "WIN").length
    const losses = trades.filter((t) => t.result === "LOSS").length
    const net = trades.reduce((sum, trade) => sum + Number(trade.profit || 0), 0)
    const winRate = total ? Math.round((wins / total) * 100) : 0

    return { total, wins, losses, net, winRate }
  }, [trades])

  return (
    <Layout>
      <div style={{ padding: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <StatCard title="Demo Balance" value={`$${wallet.demo_balance.toFixed(2)}`} accent="#22c55e" />
          <StatCard title="Real Balance" value={`$${wallet.real_balance.toFixed(2)}`} accent="#3b82f6" />
          <StatCard title="Win Rate" value={`${stats.winRate}%`} accent="#22c55e" />
          <StatCard title="Net Profit" value={`$${stats.net.toFixed(2)}`} accent={stats.net >= 0 ? "#22c55e" : "#ef4444"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, marginTop: 16 }}>
          <div style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Portfolio Overview</h3>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>{stats.total} trades</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <MiniStat label="Total" value={stats.total} />
              <MiniStat label="Wins" value={stats.wins} color="#22c55e" />
              <MiniStat label="Losses" value={stats.losses} color="#ef4444" />
            </div>
          </div>

          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {trades.slice(0, 6).map((trade) => (
                <div key={trade.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1f2937", paddingBottom: 8 }}>
                  <span>{trade.result} · {trade.mode}</span>
                  <span style={{ color: Number(trade.profit || 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                    {Number(trade.profit || 0) >= 0 ? "+" : ""}${Number(trade.profit || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ title, value, accent }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 18, transition: "transform 0.2s ease" }}>
      <div style={{ fontSize: 14, color: "#94a3b8" }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent, marginTop: 8 }}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value, color = "#3b82f6" }) {
  return (
    <div style={{ background: "#0b1220", borderRadius: 12, padding: 12 }}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 18
}