import { useState } from "react"
import { useNavigate } from "react-router-dom"

function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const register = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields")
      return
    }

    setLoading(true)

    try {
      console.log("Register request started", { name, email })

      const res = await fetch("http://localhost:5000/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()
      console.log("Register response:", data)

      alert(data.message || (data.success ? "OTP sent successfully" : "Unable to send OTP"))

      if (data.success) {
        navigate("/verify-otp", {
          replace: true,
          state: { name, email, password }
        })
      }
    } catch (error) {
      console.error("Register error:", error)
      alert("Unable to connect to the server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a" }}>
      <div style={{ width: "420px", background: "#111827", color: "#e5e7eb", padding: 32, borderRadius: 16 }}>
        <h1 style={{ marginTop: 0, textAlign: "center" }}>THB Nexus</h1>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>Register</h2>

        <input
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...inputStyle, marginTop: 12 }}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, marginTop: 12 }}
        />

        <button onClick={register} disabled={loading} style={buttonStyle}>
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          Already have an account? <a href="/" style={{ color: "#60a5fa" }}>Login</a>
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0b1220",
  color: "#e5e7eb"
}

const buttonStyle = {
  width: "100%",
  marginTop: 18,
  padding: "12px",
  border: 0,
  borderRadius: 10,
  background: "linear-gradient(90deg, #22c55e, #0ea5e9)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

export default Register