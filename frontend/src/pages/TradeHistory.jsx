import { useEffect, useState } from "react"
import Layout from "../components/Layout"

function TradeHistory() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [trades, setTrades] = useState([])

  const loadTrades = async () => {
    if (!email) return
    const res = await fetch("https://thbnexus.onrender.com/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (data.success) setTrades(data.trades || [])
  }

  useEffect(() => {
    loadTrades()
    const interval = setInterval(loadTrades, 3000)
    return () => clearInterval(interval)
  }, [email])

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Trade History</h1>
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e2e8f0" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Mode</th>
                <th style={thStyle}>Result</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Profit</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id}>
                  <td style={tdStyle}>{t.id}</td>
                  <td style={tdStyle}>{t.mode}</td>
                  <td style={{ ...tdStyle, color: t.result === "WIN" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{t.result}</td>
                  <td style={tdStyle}>${Number(t.amount || 0).toFixed(2)}</td>
                  <td style={{ ...tdStyle, color: Number(t.profit || 0) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                    {Number(t.profit || 0) >= 0 ? "+" : ""}${Number(t.profit || 0).toFixed(2)}
                  </td>
                  <td style={tdStyle}>{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

const thStyle = { padding: 12, textAlign: "left" }
const tdStyle = { padding: 12, borderBottom: "1px solid #e5e7eb" }

export default TradeHistory