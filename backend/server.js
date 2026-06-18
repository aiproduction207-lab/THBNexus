const express = require("express")
const cors = require("cors")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcrypt")

const app = express()
app.use(cors())
app.use(express.json())

const db = new sqlite3.Database("./nexus.db")

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows || [])
    })
  })

const isValidAmount = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0
}

const getModeColumn = (mode) => (mode === "real" ? "real_balance" : "demo_balance")

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name || "",
  email: user.email || "",
  role: user.email === "thbnexus@gmail.com" ? "admin" : "user",
  demo_balance: Number(user.demo_balance || 0),
  real_balance: Number(user.real_balance || 0),
  is_blocked: Number(user.is_blocked || 0),
  kyc_status: user.kyc_status || "pending",
  phone: user.phone || "",
  country: user.country || "",
  document_type: user.document_type || ""
})

const normalizeMode = (mode) => (mode === "real" ? "real" : "demo")

const BOT_INTERVAL = 3500
let bots = {}

const initDb = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      demo_balance REAL DEFAULT 2000,
      real_balance REAL DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      kyc_status TEXT DEFAULT 'pending',
      phone TEXT,
      country TEXT,
      document_type TEXT
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      mode TEXT,
      result TEXT,
      amount REAL,
      profit REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const admin = await dbGet("SELECT email FROM users WHERE email = ?", [
    "thbnexus@gmail.com"
  ])

  if (!admin) {
    const passwordHash = await bcrypt.hash("admin123", 10)
    await dbRun(
      "INSERT INTO users (name, email, password, demo_balance, real_balance) VALUES (?, ?, ?, ?, ?)",
      ["Admin", "thbnexus@gmail.com", passwordHash, 5000, 5000]
    )
  }
}

initDb().catch((err) => {
  console.error("DB init failed:", err)
})

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Please fill all fields" })
    }

    const emailLower = String(email).trim().toLowerCase()
    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [emailLower])

    if (existing) {
      return res.json({ success: false, message: "Email already registered" })
    }

    const hashed = await bcrypt.hash(password, 10)
    await dbRun(
      "INSERT INTO users (name, email, password, demo_balance, real_balance) VALUES (?, ?, ?, 2000, 0)",
      [String(name).trim(), emailLower, hashed]
    )

    return res.json({ success: true, message: "Account created successfully" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Registration failed" })
  }
})

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower || !password) {
      return res.json({ success: false, message: "Email and password are required" })
    }

    const user = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])

    if (!user) {
      return res.json({ success: false, message: "Invalid login credentials" })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.json({ success: false, message: "Invalid login credentials" })
    }

    if (Number(user.is_blocked) === 1) {
      return res.json({ success: false, message: "Your account has been blocked" })
    }

    return res.json({
      success: true,
      user: sanitizeUser(user)
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Login failed" })
  }
})

app.post("/api/me", async (req, res) => {
  try {
    const { email } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    const user = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])
    if (!user) {
      return res.json({ success: false, message: "User not found" })
    }

    return res.json({ success: true, user: sanitizeUser(user) })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Unable to load profile" })
  }
})

app.post("/api/wallet", async (req, res) => {
  try {
    const { email } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    const user = await dbGet(
      "SELECT demo_balance, real_balance, name, email FROM users WHERE email = ?",
      [emailLower]
    )

    if (!user) {
      return res.json({ success: false, message: "User not found" })
    }

    return res.json({
      success: true,
      demo_balance: Number(user.demo_balance || 0),
      real_balance: Number(user.real_balance || 0),
      email: user.email,
      name: user.name || ""
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Wallet failed to load" })
  }
})

app.post("/api/deposit", async (req, res) => {
  try {
    const { email, amount, mode } = req.body
    const emailLower = String(email || "").trim().toLowerCase()
    const selectedMode = normalizeMode(mode)

    if (!emailLower || !isValidAmount(amount)) {
      return res.json({ success: false, message: "Enter a valid amount" })
    }

    const column = getModeColumn(selectedMode)
    const user = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])

    if (!user) {
      return res.json({ success: false, message: "User not found" })
    }

    await dbRun(`UPDATE users SET ${column} = ${column} + ? WHERE email = ?`, [
      Number(amount),
      emailLower
    ])

    const updated = await dbGet(
      "SELECT demo_balance, real_balance FROM users WHERE email = ?",
      [emailLower]
    )

    return res.json({
      success: true,
      message: "Deposit successful",
      demo_balance: Number(updated.demo_balance || 0),
      real_balance: Number(updated.real_balance || 0)
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Deposit failed" })
  }
})

app.post("/api/withdraw", async (req, res) => {
  try {
    const { email, amount, mode } = req.body
    const emailLower = String(email || "").trim().toLowerCase()
    const selectedMode = normalizeMode(mode)

    if (!emailLower || !isValidAmount(amount)) {
      return res.json({ success: false, message: "Enter a valid amount" })
    }

    const column = getModeColumn(selectedMode)
    const user = await dbGet(`SELECT ${column} AS balance FROM users WHERE email = ?`, [
      emailLower
    ])

    if (!user || Number(user.balance || 0) < Number(amount)) {
      return res.json({ success: false, message: "Insufficient balance" })
    }

    await dbRun(`UPDATE users SET ${column} = ${column} - ? WHERE email = ?`, [
      Number(amount),
      emailLower
    ])

    const updated = await dbGet(
      "SELECT demo_balance, real_balance FROM users WHERE email = ?",
      [emailLower]
    )

    return res.json({
      success: true,
      message: "Withdrawal successful",
      demo_balance: Number(updated.demo_balance || 0),
      real_balance: Number(updated.real_balance || 0)
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Withdrawal failed" })
  }
})

app.post("/api/profile", async (req, res) => {
  try {
    const { email, name, phone, country } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    await dbRun(
      "UPDATE users SET name = ?, phone = ?, country = ? WHERE email = ?",
      [
        String(name || "").trim(),
        String(phone || "").trim(),
        String(country || "").trim(),
        emailLower
      ]
    )

    const user = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])
    return res.json({ success: true, user: sanitizeUser(user) })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Profile update failed" })
  }
})

app.post("/api/kyc", async (req, res) => {
  try {
    const { email, document_type, country } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    await dbRun(
      "UPDATE users SET document_type = ?, country = ?, kyc_status = 'review' WHERE email = ?",
      [String(document_type || "").trim(), String(country || "").trim(), emailLower]
    )

    return res.json({ success: true, message: "KYC submitted successfully" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "KYC submission failed" })
  }
})

app.post("/api/bot/start", async (req, res) => {
  try {
    const { email, mode } = req.body
    const emailLower = String(email || "").trim().toLowerCase()
    const selectedMode = normalizeMode(mode)

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    const user = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])
    if (!user) {
      return res.json({ success: false, message: "User not found" })
    }

    if (Number(user.is_blocked) === 1) {
      return res.json({ success: false, message: "Account is blocked" })
    }

    if (bots[emailLower]) {
      clearInterval(bots[emailLower].interval)
    }

    bots[emailLower] = {
      mode: selectedMode,
      interval: setInterval(async () => {
        try {
          const current = await dbGet(
            "SELECT * FROM users WHERE email = ?",
            [emailLower]
          )
          if (!current) return

          const amount = Number((Math.random() * 4 + 1).toFixed(2))
          const isWin = Math.random() < 0.85
          const multiplier = 1.5 + Math.random() * 0.5
          const profit = isWin
            ? Number((amount * multiplier).toFixed(2))
            : -Number(amount.toFixed(2))
          const column = getModeColumn(bots[emailLower]?.mode || selectedMode)

          await dbRun(`UPDATE users SET ${column} = ${column} + ? WHERE email = ?`, [
            profit,
            emailLower
          ])
          await dbRun(
            "INSERT INTO trades (email, mode, result, amount, profit) VALUES (?, ?, ?, ?, ?)",
            [
              emailLower,
              bots[emailLower]?.mode || selectedMode,
              isWin ? "WIN" : "LOSS",
              amount,
              profit
            ]
          )
        } catch (error) {
          console.error("Bot error:", error)
        }
      }, BOT_INTERVAL)
    }

    return res.json({ success: true, message: "Bot started" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Bot failed to start" })
  }
})

app.post("/api/bot/stop", async (req, res) => {
  try {
    const { email } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (bots[emailLower]) {
      clearInterval(bots[emailLower].interval)
      delete bots[emailLower]
    }

    return res.json({ success: true, message: "Bot stopped" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Bot failed to stop" })
  }
})

app.post("/api/trades", async (req, res) => {
  try {
    const { email } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    const rows = await dbAll(
      "SELECT * FROM trades WHERE email = ? ORDER BY id DESC LIMIT 50",
      [emailLower]
    )

    return res.json({ success: true, trades: rows })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Trade history failed" })
  }
})

app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await dbAll(
      "SELECT id, name, email, demo_balance, real_balance, is_blocked, kyc_status FROM users ORDER BY id ASC"
    )
    return res.json({
      success: true,
      users: users.map((user) => ({
        ...user,
        demo_balance: Number(user.demo_balance || 0),
        real_balance: Number(user.real_balance || 0)
      }))
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Failed to load users" })
  }
})

app.post("/api/admin/credit", async (req, res) => {
  try {
    const { email, amount, type } = req.body
    const emailLower = String(email || "").trim().toLowerCase()
    const selectedType = type === "real" ? "real" : "demo"

    if (!emailLower || !isValidAmount(amount)) {
      return res.json({ success: false, message: "Invalid credit request" })
    }

    const column = getModeColumn(selectedType)
    await dbRun(`UPDATE users SET ${column} = ${column} + ? WHERE email = ?`, [
      Number(amount),
      emailLower
    ])

    return res.json({ success: true, message: "Balance credited successfully" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Credit failed" })
  }
})

app.post("/api/admin/delete-user", async (req, res) => {
  try {
    const { email } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    await dbRun("DELETE FROM trades WHERE email = ?", [emailLower])
    await dbRun("DELETE FROM users WHERE email = ?", [emailLower])

    return res.json({ success: true, message: "User deleted" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Delete failed" })
  }
})

app.post("/api/admin/block-user", async (req, res) => {
  try {
    const { email, blocked } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    await dbRun("UPDATE users SET is_blocked = ? WHERE email = ?", [
      blocked ? 1 : 0,
      emailLower
    ])

    return res.json({
      success: true,
      message: blocked ? "User blocked" : "User unblocked"
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Block action failed" })
  }
})

app.get("/api/admin/trades", async (req, res) => {
  try {
    const rows = await dbAll(
      "SELECT id, email, mode, result, amount, profit, created_at FROM trades ORDER BY id DESC LIMIT 100"
    )
    return res.json({ success: true, trades: rows })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Failed to load trade logs" })
  }
})

app.listen(5000, () => {
  console.log("THB Nexus running on http://localhost:5000")
})