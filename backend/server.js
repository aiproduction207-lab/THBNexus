const express = require("express")
const cors = require("cors")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcrypt")

const app = express()
app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  console.log("REQUEST", req.method, req.originalUrl)
  if (Object.keys(req.body || {}).length) {
    console.log("REQUEST BODY", req.body)
  }
  next()
})

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
const normalizeMode = (mode) => (mode === "real" ? "real" : "demo")

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name || "",
  email: user.email || "",
  role: user.email === "thbnexus@gmail.com" ? "admin" : "user",
  demo_balance: Number(user.demo_balance || 0),
  real_balance: Number(user.real_balance || 0),
  avatar: user.avatar || "",
  is_blocked: Number(user.is_blocked || 0),
  kyc_status: user.kyc_status || "pending",
  phone: user.phone || "",
  country: user.country || "",
  document_type: user.document_type || ""
})

const ensureColumn = async (table, column, definition) => {
  const columns = await dbAll(`PRAGMA table_info(${table})`)
  if (!columns.some((entry) => entry.name === column)) {
    await dbRun(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

const BOT_INTERVAL = 3500
const strategyStats = {
  SAFE: { rate: 0.9, min: 1, max: 4 },
  AGGRESSIVE: { rate: 0.75, min: 1, max: 5 },
  SNIPER: { rate: 0.6, min: 1, max: 3 }
}
let bots = {}
const pendingRegistrations = new Map()

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000))

const createPendingRegistration = async (email, name, password) => {
  const passwordHash = await bcrypt.hash(password, 10)
  const otp = generateOTP()
  pendingRegistrations.set(email, {
    email,
    name,
    passwordHash,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  })
  console.log("OTP GENERATED", { email, otp })
  return otp
}

const initDb = async () => {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      demo_balance REAL DEFAULT 2000,
      real_balance REAL DEFAULT 0,
      avatar TEXT,
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
      strategy TEXT,
      account_type TEXT,
      result TEXT,
      amount REAL,
      profit REAL,
      profit_loss REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS deposit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      amount REAL,
      mode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await dbRun(`
    CREATE TABLE IF NOT EXISTS withdrawal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      amount REAL,
      mode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await ensureColumn("users", "password", "TEXT")
  await ensureColumn("users", "demo_balance", "REAL DEFAULT 2000")
  await ensureColumn("users", "real_balance", "REAL DEFAULT 0")
  await ensureColumn("users", "avatar", "TEXT")
  await ensureColumn("users", "is_blocked", "INTEGER DEFAULT 0")
  await ensureColumn("users", "kyc_status", "TEXT DEFAULT 'pending'")
  await ensureColumn("users", "phone", "TEXT")
  await ensureColumn("users", "country", "TEXT")
  await ensureColumn("users", "document_type", "TEXT")
  await ensureColumn("trades", "strategy", "TEXT")
  await ensureColumn("trades", "account_type", "TEXT")
  await ensureColumn("trades", "profit_loss", "REAL")

  const admin = await dbGet("SELECT email FROM users WHERE email = ?", [
    "thbnexus@gmail.com"
  ])

  if (!admin) {
    const passwordHash = await bcrypt.hash("admin123", 10)
    await dbRun(
      "INSERT INTO users (name, email, password, demo_balance, real_balance, kyc_status) VALUES (?, ?, ?, ?, ?, ?)",
      ["Admin", "thbnexus@gmail.com", passwordHash, 5000, 5000, "approved"]
    )
  }
}

initDb().catch((err) => {
  console.error("DB init failed:", err)
})

app.post("/api/register", async (req, res) => {
  try {
    console.log("REGISTER REQUEST", req.body)
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please fill all fields" })
    }

    const emailLower = String(email).trim().toLowerCase()
    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [emailLower])

    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" })
    }

    const hashed = await bcrypt.hash(password, 10)
    await dbRun(
      "INSERT INTO users (name, email, password, demo_balance, real_balance) VALUES (?, ?, ?, 2000, 0)",
      [String(name).trim(), emailLower, hashed]
    )

    return res.json({ success: true, message: "Account created successfully" })
  } catch (error) {
    console.error("REGISTER ERROR", error)
    return res.status(500).json({ success: false, message: "Registration failed" })
  }
})

app.post("/api/send-otp", async (req, res) => {
  try {
    console.log("SEND OTP REQUEST", req.body)
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please fill all fields" })
    }

    const emailLower = String(email).trim().toLowerCase()
    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [emailLower])

    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" })
    }

    const otp = await createPendingRegistration(emailLower, String(name).trim(), password)

    return res.json({
      success: true,
      message: "OTP sent successfully",
      otp
    })
  } catch (error) {
    console.error("SEND OTP ERROR", error)
    return res.status(500).json({ success: false, message: "Unable to send OTP" })
  }
})

app.post("/api/verify-otp", async (req, res) => {
  try {
    console.log("VERIFY OTP REQUEST", req.body)
    const { name, email, password, otp } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!name || !emailLower || !password || !otp) {
      return res.status(400).json({ success: false, message: "Missing verification details" })
    }

    const pending = pendingRegistrations.get(emailLower)
    if (!pending || pending.expiresAt < Date.now()) {
      pendingRegistrations.delete(emailLower)
      return res.status(400).json({ success: false, message: "OTP expired or invalid" })
    }

    if (String(pending.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" })
    }

    const existing = await dbGet("SELECT id FROM users WHERE email = ?", [emailLower])
    if (existing) {
      pendingRegistrations.delete(emailLower)
      return res.status(409).json({ success: false, message: "Email already registered" })
    }

    await dbRun(
      "INSERT INTO users (name, email, password, demo_balance, real_balance) VALUES (?, ?, ?, 2000, 0)",
      [pending.name, emailLower, pending.passwordHash]
    )

    pendingRegistrations.delete(emailLower)

    const createdUser = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])

    return res.json({
      success: true,
      message: "Account verified successfully",
      user: sanitizeUser(createdUser)
    })
  } catch (error) {
    console.error("VERIFY OTP ERROR", error)
    return res.status(500).json({ success: false, message: "Verification failed" })
  }
})

app.post("/api/login", async (req, res) => {
  try {
    console.log("LOGIN REQUEST", req.body)
    const { email, password } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" })
    }

    const user = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid login credentials" })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid login credentials" })
    }

    if (Number(user.is_blocked) === 1) {
      return res.status(403).json({ success: false, message: "Your account has been blocked" })
    }

    return res.json({ success: true, user: sanitizeUser(user) })
  } catch (error) {
    console.error("LOGIN ERROR", error)
    return res.status(500).json({ success: false, message: "Login failed" })
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
    await dbRun(
      "INSERT INTO deposit_logs (email, amount, mode) VALUES (?, ?, ?)",
      [emailLower, Number(amount), selectedMode]
    )

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
    await dbRun(
      "INSERT INTO withdrawal_logs (email, amount, mode) VALUES (?, ?, ?)",
      [emailLower, Number(amount), selectedMode]
    )

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
    const { email, name, phone, country, avatar } = req.body
    const emailLower = String(email || "").trim().toLowerCase()

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    await dbRun(
      "UPDATE users SET name = ?, phone = ?, country = ?, avatar = ? WHERE email = ?",
      [
        String(name || "").trim(),
        String(phone || "").trim(),
        String(country || "").trim(),
        String(avatar || ""),
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
      "UPDATE users SET document_type = ?, country = ?, kyc_status = 'pending' WHERE email = ?",
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
    const { email, mode, strategy } = req.body
    const emailLower = String(email || "").trim().toLowerCase()
    const selectedMode = normalizeMode(mode)
    const selectedStrategy = strategy || "SAFE"

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
      strategy: selectedStrategy,
      interval: setInterval(async () => {
        try {
          const current = await dbGet("SELECT * FROM users WHERE email = ?", [emailLower])
          if (!current) return

          const config = strategyStats[selectedStrategy.toUpperCase()] || strategyStats.SAFE
          const amount = Number(
            (Math.random() * (config.max - config.min) + config.min).toFixed(2)
          )
          const isWin = Math.random() < config.rate
          const multiplier = isWin ? 1.5 + Math.random() * 0.5 : 1
          const profit = isWin
            ? Number((amount * multiplier).toFixed(2))
            : -Number(amount.toFixed(2))
          const column = getModeColumn(bots[emailLower]?.mode || selectedMode)

          await dbRun(`UPDATE users SET ${column} = ${column} + ? WHERE email = ?`, [
            profit,
            emailLower
          ])

          await dbRun(
            "INSERT INTO trades (email, mode, strategy, account_type, result, amount, profit, profit_loss) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              emailLower,
              bots[emailLower]?.mode || selectedMode,
              bots[emailLower]?.strategy || selectedStrategy,
              bots[emailLower]?.mode || selectedMode,
              isWin ? "WIN" : "LOSS",
              amount,
              profit,
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
      "SELECT id, email, mode, strategy, account_type, result, amount, profit, profit_loss, created_at FROM trades WHERE email = ? ORDER BY id DESC LIMIT 50",
      [emailLower]
    )

    return res.json({
      success: true,
      trades: rows.map((row) => ({
        ...row,
        profit_loss: Number(row.profit_loss || row.profit || 0),
        profit: Number(row.profit || row.profit_loss || 0)
      }))
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Trade history failed" })
  }
})

app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await dbAll(
      "SELECT id, name, email, demo_balance, real_balance, is_blocked, kyc_status, document_type, avatar FROM users ORDER BY id ASC"
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
    await dbRun("DELETE FROM deposit_logs WHERE email = ?", [emailLower])
    await dbRun("DELETE FROM withdrawal_logs WHERE email = ?", [emailLower])
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

app.post("/api/admin/update-kyc", async (req, res) => {
  try {
    const { email, status } = req.body
    const emailLower = String(email || "").trim().toLowerCase()
    const nextStatus = status || "pending"

    if (!emailLower) {
      return res.json({ success: false, message: "Email is required" })
    }

    await dbRun("UPDATE users SET kyc_status = ? WHERE email = ?", [
      nextStatus,
      emailLower
    ])

    return res.json({ success: true, message: "KYC status updated" })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "KYC update failed" })
  }
})

app.get("/api/admin/trades", async (req, res) => {
  try {
    const rows = await dbAll(
      "SELECT id, email, mode, strategy, account_type, result, amount, profit, profit_loss, created_at FROM trades ORDER BY id DESC LIMIT 120"
    )
    return res.json({
      success: true,
      trades: rows.map((row) => ({
        ...row,
        profit_loss: Number(row.profit_loss || row.profit || 0),
        profit: Number(row.profit || row.profit_loss || 0)
      }))
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Failed to load trade logs" })
  }
})

app.get("/api/admin/summary", async (req, res) => {
  try {
    const users = await dbAll(
      "SELECT id, email, demo_balance, real_balance, kyc_status, is_blocked FROM users"
    )
    const trades = await dbAll(
      "SELECT id, email, result, amount, profit, profit_loss, created_at FROM trades"
    )
    const deposits = await dbAll(
      "SELECT id, email, amount, mode, created_at FROM deposit_logs ORDER BY id DESC LIMIT 8"
    )
    const withdrawals = await dbAll(
      "SELECT id, email, amount, mode, created_at FROM withdrawal_logs ORDER BY id DESC LIMIT 8"
    )

    const totalPlatformProfit = trades.reduce(
      (sum, trade) => sum + Number(trade.profit_loss || trade.profit || 0),
      0
    )

    return res.json({
      success: true,
      summary: {
        totalUsers: users.length,
        totalTrades: trades.length,
        activeBots: Object.keys(bots).length,
        totalPlatformProfit,
        recentTrades: trades.slice(0, 8),
        recentDeposits: deposits,
        recentWithdrawals: withdrawals
      }
    })
  } catch (error) {
    console.error(error)
    return res.json({ success: false, message: "Failed to load admin summary" })
  }
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  })
})

app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR", err)
  res.status(500).json({
    success: false,
    message: "Server error"
  })
})

app.listen(5000, () => {
  console.log("THB Nexus running on http://localhost:5000")
})