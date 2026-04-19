require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ── Routes ──────────────────────────────────────
const authRoutes = require("./routes/auth");
const consumerRoutes = require("./routes/consumer");
const consumptionRoutes = require("./routes/consumption");

const app = express();

// ── Connect DB ──────────────────────────────────
connectDB().catch((err) => {
  console.error("Mongo bootstrap error:", err.message);
});

// ── Middleware ──────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin requests (tools, Postman) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "TNEB Backend API",
    dbState:
      process.env.MONGO_URI || process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL
        ? "configured"
        : "missing_mongo_uri",
  });
});

// ── API Routes ──────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/consumer", consumerRoutes);
app.use("/api/consumption", consumptionRoutes);


// ── Ignore favicon requests ─────────────────────
app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});
// ── 404 handler ─────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

module.exports = app;
