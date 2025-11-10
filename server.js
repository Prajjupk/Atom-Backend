const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");

// Load env
dotenv.config();

// Connect DB
connectDB();

const app = express();

// --- Ensure uploads dir exists at boot ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(express.json());

// ---------- CORS (explicit) ----------
/*
  Use FRONTEND_URL in your Render environment variables, e.g.
  FRONTEND_URL=https://atom-frontend.vercel.app
  This allows the backend to accept Authorization header from that origin.
*/
const allowedOrigins = [
  process.env.FRONTEND_URL,    // set this in Render (production)
  "http://localhost:5173",     // Vite dev
  "http://localhost:3000",     // optional
].filter(Boolean); // removes undefined if FRONTEND_URL not set

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS policy: Origin not allowed"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Static files for uploaded assets (served at /uploads/...)
app.use("/uploads", express.static(uploadDir));

// Routes
const userRoutes = require("./routes/UserRoutes");
const taskRoutes = require("./routes/TaskRoutes");

app.get("/", (_req, res) => {
  res.send("Server and MongoDB connected successfully 🚀");
});

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
