// =============================
//  Nema Kunku Diaspora Backend
// =============================
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

// Routes
import memberRoutes from "./routes/memberRoutes.js";
import contributionRoutes from "./routes/contributionRoutes.js";
import expenditureRoutes from "./routes/expenditureRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

// ---------- Env ----------
const DEFAULT_PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nkd";

// ---------- Core middleware ----------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

// ---------- CORS (robust) ----------
const allowedOrigins = new Set([
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  // add your live domain(s) when ready:
  // "https://nemakunkudiaspora.org",
]);

const corsOptions = {
  origin(origin, cb) {
    // Allow tools/curl/postman (no origin) and approved origins
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS not allowed for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
// Also reply to preflight quickly
app.options("*", cors(corsOptions));

// Helpful headers for some setups
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.has(origin)) {
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  next();
});

// ---------- Health & Diagnostics ----------
app.get("/", (_req, res) => {
  res.send("✅ Nema Kunku Diaspora API is running…");
});

app.get("/api/_cors-check", (req, res) => {
  res.json({
    ok: true,
    origin: req.headers.origin || null,
    allowOrigin: res.get("Access-Control-Allow-Origin") || null,
    allowCreds: res.get("Access-Control-Allow-Credentials") || null,
  });
});

app.get("/api/_health", (_req, res) => {
  res.json({ ok: true, mongo: mongoose.connection.readyState });
});

// ---------- API Routes ----------
app.use("/api/members", memberRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/expenditures", expenditureRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/auth", authRoutes);

// ---------- MongoDB ----------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err?.message || err);
    // keep running; app still serves 500s until DB is up
  });

// ---------- Port helper: find a free port ----------
function listenOnFreePort(startPort) {
  let port = startPort;

  const server = app
    .listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    })
    .on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.warn(`⚠️  Port ${port} in use. Trying ${port + 1}…`);
        port += 1;
        setTimeout(() => {
          server.close?.();
          listenOnFreePort(port);
        }, 200);
      } else {
        console.error("❌ Server error:", err);
        process.exit(1);
      }
    });
}

// ---------- Start ----------
listenOnFreePort(DEFAULT_PORT);