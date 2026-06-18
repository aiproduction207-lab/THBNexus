import { useState } from "react"
import { useNavigate } from "react-router-dom"

function VerifyOTP() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)

  const verifyOtp = async () => {
    if (!otp) {
      alert("Please enter the OTP")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp })
      })
      const data = await res.json()
      alert(data.message || (data.success ? "Account verified" : "Verification failed"))
      if (data.success) navigate("/")
    } catch (error) {
      alert("Verification failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a" }}>
      <div style={{ width: "420px", background: "#111827", color: "#e5e7eb", padding: 32, borderRadius: 16 }}>
        <h1 style={{ marginTop: 0, textAlign: "center" }}>THB Nexus</h1>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>Verify OTP</h2>

        <input
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          style={inputStyle}
        />

        <button onClick={verifyOtp} disabled={loading} style={buttonStyle}>
          {loading ? "Verifying..." : "Verify Account"}
        </button>
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

export default VerifyOTP