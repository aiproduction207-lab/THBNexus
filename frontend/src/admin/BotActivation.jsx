import { useEffect, useState } from "react"

function BotActivation() {
  const email = localStorage.getItem("thb_user")

  const [status, setStatus] = useState("STOPPED")
  const [profit, setProfit] = useState(0)
  const [trades, setTrades] = useState([])
  const [speed, setSpeed] = useState(5000)

  const startBot = async () => {
    await fetch("http://localhost:5000/api/bot/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })

    setStatus("RUNNING")
  }

  const stopBot = async () => {
    await fetch("http://localhost:5000/api/bot/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })

    setStatus("STOPPED")
  }

  // Fake live UI updates (frontend simulation)
  useEffect(() => {
    if (status !== "RUNNING") return

    const interval = setInterval(() => {
      const win = Math.random() > 0.5
      const amount = Math.floor(Math.random() * 5) + 1

      const trade = {
        time: new Date().toLocaleTimeString(),
        result: win ? "WIN" : "LOSS",
        amount: amount
      }

      setTrades((prev) => [trade, ...prev].slice(0, 10))

      if (win) {
        setProfit((p) => p + amount)
      } else {
        setProfit((p) => p - amount)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [status, speed])

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>

      {/* HEADER */}
      <h1>🤖 THB Nexus Trading Terminal</h1>

      {/* STATUS PANEL */}
      <div style={{
        display: "flex",
        gap: "20px",
        marginTop: "10px"
      }}>
        <div>
          <h3>Status</h3>
          <p style={{ color: status === "RUNNING" ? "green" : "red" }}>
            {status}
          </p>
        </div>

        <div>
          <h3>Profit</h3>
          <p style={{ color: profit >= 0 ? "green" : "red" }}>
            ${profit}
          </p>
        </div>

        <div>
          <h3>User</h3>
          <p>{email}</p>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={startBot}
          style={{ background: "green", color: "white", padding: "10px", marginRight: "10px" }}
        >
          ▶ START BOT
        </button>

        <button
          onClick={stopBot}
          style={{ background: "red", color: "white", padding: "10px" }}
        >
          ⛔ STOP BOT
        </button>
      </div>

      {/* SPEED CONTROL */}
      <div style={{ marginTop: "20px" }}>
        <h3>Bot Speed</h3>

        <select onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value="5000">Slow (5s)</option>
          <option value="3000">Normal (3s)</option>
          <option value="1500">Fast (1.5s)</option>
        </select>
      </div>

      {/* TRADE FEED */}
      <div style={{ marginTop: "20px" }}>
        <h2>📊 Live Trades</h2>

        <div style={{
          background: "#111",
          color: "#fff",
          padding: "10px",
          height: "200px",
          overflowY: "auto"
        }}>
          {trades.map((t, i) => (
            <div key={i}>
              [{t.time}] {t.result} {t.amount}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default BotActivation