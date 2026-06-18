import { useState } from "react"
import Layout from "../components/Layout"

function KYC() {
  const stored = JSON.parse(localStorage.getItem("thb_user") || "null")
  const email = stored?.email || ""

  const [documentType, setDocumentType] = useState("")
  const [country, setCountry] = useState("")
  const [loading, setLoading] = useState(false)

  const submitKYC = async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("http://localhost:5000/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, document_type: documentType, country })
      })
      const data = await res.json()
      alert(data.message || (data.success ? "KYC submitted" : "KYC failed"))
    } catch (error) {
      alert("KYC submission failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div style={{ padding: 6 }}>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 20, maxWidth: 620 }}>
          <h2 style={{ marginTop: 0 }}>KYC Verification</h2>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} style={inputStyle}>
            <option value="">Select Document Type</option>
            <option value="passport">Passport</option>
            <option value="national_id">National ID</option>
            <option value="driver_license">Driver License</option>
          </select>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" style={{ ...inputStyle, marginTop: 12 }} />
          <button onClick={submitKYC} disabled={loading} style={buttonStyle}>
            {loading ? "Submitting..." : "Submit KYC"}
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

const buttonStyle = {
  width: "100%",
  marginTop: 16,
  padding: "12px",
  border: 0,
  borderRadius: 10,
  background: "#8b5cf6",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
}

export default KYC