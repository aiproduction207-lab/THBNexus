import { useEffect, useMemo, useState } from "react"
import Layout from "../components/Layout"

export default function BotActivation() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [mode, setMode] = useState("demo")
  const [running, setRunning] = useState(false)
  const [trades, setTrades] = useState([])
  const [wallet, setWallet] = useState({ demo_balance: 0, real_balance: 0 })

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

  const start = async () => {
    if (!email) return
    const res = await fetch("http://localhost:5000/api/bot/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode })
    })
    const data = await res.json()
    if (data.success) setRunning(true)
    else alert(data.message || "Could not start bot")
  }

  const stop = async () => {
    if (!email) return
    const res = await fetch("http://localhost:5000/api/bot/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (data.success) setRunning(false)
  }

  useEffect(() => {
    loadTrades()
    loadWallet()
    const tradeInterval = setInterval(loadTrades, 2000)
    const walletInterval = setInterval(loadWallet, 3000)
    return () => {
      clearInterval(tradeInterval)
      clearInterval(walletInterval)
    }
  }, [email])

  const stats = useMemo(() => {
    const total = trades.length
    const wins = trades.filter((t) => t.result === "WIN").length
    const losses = trades.filter((t) => t.result === "LOSS").length
    const net = trades.reduce((sum, t) => sum + Number(t.profit || 0), 0)
    return { total, wins, losses, net }
  }, [trades])

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Bot Terminal</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <MiniCard label="Mode" value={mode.toUpperCase()} />
          <MiniCard label="Status" value={running ? "RUNNING" : "STOPPED"} valueColor={running ? "#16a34a" : "#dc2626"} />
          <MiniCard label="Total Trades" value={stats.total} />
          <MiniCard label="Wins" value={stats.wins} />
          <MiniCard label="Losses" value={stats.losses} />
          <MiniCard label="Net Profit" value={`$${stats.net.toFixed(2)}`} valueColor={stats.net >= 0 ? "#16a34a" : "#dc2626"} />
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={selectStyle}>
            <option value="demo">Demo</option>
            <option value="real">Real</option>
          </select>
          <button onClick={start} style={buttonStyle("#16a34a")}>Start</button>
          <button onClick={stop} style={buttonStyle("#dc2626")}>Stop</button>
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Wallet</h3>
            <p>Demo: <strong>${wallet.demo_balance.toFixed(2)}</strong></p>
            <p>Real: <strong>${wallet.real_balance.toFixed(2)}</strong></p>
          </div>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Live Trade Feed</h3>
            <div style={{ background: "#0f172a", color: "#22c55e", padding: 12, borderRadius: 10, minHeight: 240, overflowY: "auto" }}>
              {trades.slice(0, 12).map((trade) => (
                <div key={trade.id} style={{ marginBottom: 8 }}>
                  [{new Date(trade.created_at).toLocaleTimeString()}] {trade.result} · {trade.mode} · ${Number(trade.amount || 0).toFixed(2)} · {Number(trade.profit || 0) >= 0 ? "+" : ""}${Number(trade.profit || 0).toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function MiniCard({ label, value, valueColor = "#111827" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 13, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor }}>{value}</div>
    </div>
  )
}

const selectStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1"
}

const buttonStyle = (bg) => ({
  background: bg,
  color: "#fff",
  border: 0,
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer"
})

const panelStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 16
}