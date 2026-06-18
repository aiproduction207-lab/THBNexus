import { useEffect, useState } from "react"
import Layout from "../components/Layout"

function Profile() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [name, setName] = useState(stored?.name || "")
  const [phone, setPhone] = useState(stored?.phone || "")
  const [country, setCountry] = useState(stored?.country || "")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!email) return
      const res = await fetch("http://localhost:5000/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (data.success) {
        setName(data.user.name || "")
        setPhone(data.user.phone || "")
        setCountry(data.user.country || "")
        localStorage.setItem("thb_user", JSON.stringify(data.user))
      }
    }
    loadProfile()
  }, [email])

  const saveProfile = async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone, country })
      })
      const data = await res.json()
      alert(data.message || (data.success ? "Profile updated" : "Update failed"))
      if (data.success) {
        localStorage.setItem("thb_user", JSON.stringify(data.user))
      }
    } catch (error) {
      alert("Profile update failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Profile</h1>
        <div style={{ maxWidth: 520, background: "#fff", padding: 20, borderRadius: 12 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" style={inputStyle} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={{ ...inputStyle, marginTop: 12 }} />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" style={{ ...inputStyle, marginTop: 12 }} />
          <button onClick={saveProfile} disabled={loading} style={buttonStyle}>
            {loading ? "Saving..." : "Save Profile"}
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
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

export default Profile