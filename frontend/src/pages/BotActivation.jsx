import { useEffect, useMemo, useState } from "react"
import Layout from "../components/Layout"

export default function BotActivation() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [mode, setMode] = useState("demo")
  const [strategy, setStrategy] = useState("SAFE")
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
      body: JSON.stringify({ email, mode, strategy })
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
    const net = trades.reduce((sum, trade) => sum + Number(trade.profit || 0), 0)
    const winRate = total ? Math.round((wins / total) * 100) : 0
    return { total, wins, losses, net, winRate }
  }, [trades])

  const currentBalance = mode === "real" ? wallet.real_balance : wallet.demo_balance

  return (
    <Layout>
      <div style={{ padding: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Account Mode</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{mode.toUpperCase()} ACCOUNT</div>
              </div>
              <div style={{ background: mode === "real" ? "#1d4ed8" : "#22c55e", color: "#fff", padding: "8px 12px", borderRadius: 999, fontWeight: 700 }}>
                {running ? "BOT RUNNING" : "BOT STOPPED"}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 16 }}>
              <div style={miniPanel}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Current Balance</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#22c55e" }}>${currentBalance.toFixed(2)}</div>
              </div>
              <div style={miniPanel}>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Current Account</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === "real" ? "Real" : "Demo"}</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Bot Controls</h3>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Account</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} style={selectStyle}>
              <option value="demo">Demo Account</option>
              <option value="real">Real Account</option>
            </select>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginTop: 12, marginBottom: 6 }}>Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)} style={selectStyle}>
              <option value="SAFE">SAFE</option>
              <option value="AGGRESSIVE">AGGRESSIVE</option>
              <option value="SNIPER">SNIPER</option>
            </select>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={start} style={buttonStyle("#22c55e")}>Start</button>
              <button onClick={stop} style={buttonStyle("#ef4444")}>Stop</button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
          <MiniCard label="Total Trades" value={stats.total} accent="#3b82f6" />
          <MiniCard label="Wins" value={stats.wins} accent="#22c55e" />
          <MiniCard label="Losses" value={stats.losses} accent="#ef4444" />
          <MiniCard label="Win Rate" value={`${stats.winRate}%`} accent="#22c55e" />
          <MiniCard label="Net Profit" value={`$${stats.net.toFixed(2)}`} accent={stats.net >= 0 ? "#22c55e" : "#ef4444"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16, marginTop: 16 }}>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Strategy Info</h3>
            <div style={strategyBox}>
              <div><strong>SAFE</strong><br />90% win rate</div>
              <div><strong>AGGRESSIVE</strong><br />75% win rate</div>
              <div><strong>SNIPER</strong><br />60% win rate</div>
            </div>
          </div>
          <div style={panelStyle}>
            <h3 style={{ marginTop: 0 }}>Live Trade Feed</h3>
            <div style={{ background: "#0b1220", color: "#e5eefc", padding: 12, borderRadius: 12, minHeight: 300, overflowY: "auto" }}>
              {trades.slice(0, 18).map((trade) => (
                <div key={trade.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid #1f2937" }}>
                  <span style={{ color: Number(trade.profit || 0) >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                    {trade.result} {Number(trade.profit || 0) >= 0 ? "+" : ""}${Number(trade.profit || 0).toFixed(2)}
                  </span>
                  <span style={{ color: "#94a3b8" }}>{new Date(trade.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function MiniCard({ label, value, accent = "#3b82f6" }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>
      <div style={{ color: accent, fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  )
}

const miniPanel = {
  background: "#0b1220",
  borderRadius: 12,
  padding: 14,
  border: "1px solid #1f2937"
}

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#0b1220",
  color: "#e5eefc",
  border: "1px solid #1f2937"
}

const buttonStyle = (bg) => ({
  flex: 1,
  background: bg,
  color: "#fff",
  border: 0,
  borderRadius: 10,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer"
})

const panelStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 18
}

const strategyBox = {
  display: "grid",
  gap: 10,
  color: "#cbd5e1"
}