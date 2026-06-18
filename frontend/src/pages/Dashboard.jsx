import { useEffect, useState } from "react"
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

  const stats = trades.reduce(
    (acc, trade) => {
      acc.total += 1
      if (trade.result === "WIN") acc.wins += 1
      if (trade.result === "LOSS") acc.losses += 1
      acc.net += Number(trade.profit || 0)
      return acc
    },
    { total: 0, wins: 0, losses: 0, net: 0 }
  )

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Dashboard</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <StatCard title="Demo Balance" value={`$${wallet.demo_balance.toFixed(2)}`} color="#22c55e" />
          <StatCard title="Real Balance" value={`$${wallet.real_balance.toFixed(2)}`} color="#38bdf8" />
          <StatCard title="Total Trades" value={stats.total} color="#f59e0b" />
          <StatCard title="Net Profit" value={`$${stats.net.toFixed(2)}`} color={stats.net >= 0 ? "#22c55e" : "#ef4444"} />
        </div>

        <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {trades.slice(0, 5).map((trade) => (
              <div key={trade.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>
                <span>{trade.result} · {trade.mode} account</span>
                <span style={{ color: Number(trade.profit || 0) >= 0 ? "#16a34a" : "#dc2626" }}>
                  {Number(trade.profit || 0) >= 0 ? "+" : ""}${Number(trade.profit || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ background: color, color: "#fff", padding: 18, borderRadius: 12 }}>
      <div style={{ fontSize: 14, opacity: 0.9 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  )
}