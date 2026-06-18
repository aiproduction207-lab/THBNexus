import { useEffect, useState } from "react"
import Layout from "../components/Layout"

function Profile() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [name, setName] = useState(stored?.name || "")
  const [phone, setPhone] = useState(stored?.phone || "")
  const [country, setCountry] = useState(stored?.country || "")
  const [avatar, setAvatar] = useState(stored?.avatar || "")
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
        setAvatar(data.user.avatar || "")
        localStorage.setItem("thb_user", JSON.stringify(data.user))
      }
    }
    loadProfile()
  }, [email])

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setAvatar(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone, country, avatar })
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
      <div style={{ padding: 6 }}>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 20, maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name || "U") } alt="avatar" style={{ width: 96, height: 96, borderRadius: 999, objectFit: "cover", border: "2px solid #1e40af" }} />
            <div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Profile</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{name || "User"}</div>
              <div style={{ color: "#94a3b8" }}>{email}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" style={inputStyle} />
            <input value={email} readOnly style={inputStyle} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inputStyle} />
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" style={inputStyle} />
          </div>

          <div style={{ marginTop: 12 }}>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={uploadStyle} />
          </div>

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
  background: "#0b1220",
  color: "#e5eefc",
  border: "1px solid #1f2937"
}

const uploadStyle = {
  width: "100%",
  padding: "10px",
  color: "#94a3b8"
}

const buttonStyle = {
  width: "100%",
  marginTop: 16,
  padding: "12px",
  border: 0,
  borderRadius: 10,
  background: "linear-gradient(90deg, #3b82f6, #22c55e)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

export default Profile