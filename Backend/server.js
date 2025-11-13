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
const MONGO_URI = process.env.MONGO_URI;

// ---------- Middleware ----------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

// CORS
app.use(cors());

// ---------- Health ----------
app.get("/", (_req, res) => {
  res.send("Nema Kunku Diaspora API is running…");
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
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err.message));

// ---------- Start ----------
app.listen(DEFAULT_PORT, () =>
  console.log(`Server running on port ${DEFAULT_PORT}`)
);