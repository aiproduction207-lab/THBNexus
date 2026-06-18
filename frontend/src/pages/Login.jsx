import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function getSafeUser() {
  let user = null

  try {
    const stored = localStorage.getItem("thb_user")

    if (
      stored &&
      stored !== "undefined" &&
      stored !== "null"
    ) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === "object") {
        user = parsed
      }
    }
  } catch (error) {
    console.error("Failed to parse stored user:", error)
    localStorage.removeItem("thb_user")
  }

  return user
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = getSafeUser()

    if (user?.email) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true })
    }
  }, [navigate])

  const login = async () => {
    if (!email || !password) {
      alert("Email and password are required")
      return
    }

    setLoading(true)

    try {
      console.log("Login request started", { email })

      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      console.log("Login response:", data)

      if (data.success && data.user) {
        const normalizedUser = {
          name: data.user.name || email,
          email: data.user.email || email,
          role: data.user.role || "user",
          profile_picture: data.user.profile_picture || data.user.avatar || "",
          user_id: data.user.id || null
        }

        localStorage.setItem("thb_user", JSON.stringify(normalizedUser))
        localStorage.setItem("thb_role", normalizedUser.role)

        navigate(normalizedUser.role === "admin" ? "/admin" : "/dashboard", { replace: true })
      } else {
        alert(data.message || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Unable to connect to the server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a" }}>
      <div style={{ width: "420px", background: "#111827", color: "#e5e7eb", padding: 32, borderRadius: 16 }}>
        <h1 style={{ marginTop: 0, textAlign: "center" }}>THB Nexus</h1>
        <h2 style={{ textAlign: "center", marginBottom: 24 }}>Login</h2>

        <input
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          value={password}
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, marginTop: 12 }}
        />

        <button onClick={login} disabled={loading} style={buttonStyle}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          No account? <a href="/register" style={{ color: "#60a5fa" }}>Register</a>
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

export default Login