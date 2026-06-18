import React from "react"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("App error boundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a", color: "#e5e7eb", padding: 24 }}>
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: "#94a3b8", marginBottom: 16 }}>
              The page encountered an unexpected error. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: 0,
                background: "linear-gradient(90deg, #22c55e, #0ea5e9)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
