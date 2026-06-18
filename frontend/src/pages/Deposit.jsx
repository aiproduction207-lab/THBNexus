import { useState } from "react"
import Layout from "../components/Layout"

function Deposit() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState("demo")
  const [loading, setLoading] = useState(false)

  const deposit = async () => {
    if (!email) return
    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid amount")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Number(amount),
          mode
        })
      })
      const data = await res.json()
      alert(data.message || (data.success ? "Deposit successful" : "Deposit failed"))
      if (data.success) setAmount("")
    } catch (error) {
      alert("Deposit failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Deposit</h1>
        <div style={{ maxWidth: 420, background: "#fff", padding: 20, borderRadius: 12 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Select Account</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
            <option value="demo">Demo</option>
            <option value="real">Real</option>
          </select>

          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            style={{ ...inputStyle, marginTop: 12 }}
          />

          <button onClick={deposit} disabled={loading} style={buttonStyle}>
            {loading ? "Processing..." : "Deposit"}
          </button>
        </div>
      </div>
    </Layout>
  )
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1"
}

const buttonStyle = {
  width: "100%",
  marginTop: 16,
  padding: "12px",
  border: 0,
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

export default Deposit