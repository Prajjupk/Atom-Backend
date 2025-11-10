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

app.use(express.json());

// ---------- CORS (explicit + debug) ----------
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://atom-frontend-three.vercel.app
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (curl, server-to-server)
      if (!origin) {
        console.log("🌐 No origin (server-to-server request)");
        return callback(null, true);
      }

      // Log every incoming origin
      console.log("🌐 Incoming Origin:", origin);

      if (allowedOrigins.includes(origin)) {
        console.log("✅ CORS allowed for:", origin);
        return callback(null, true);
      } else {
        console.log("❌ CORS blocked:", origin);
        return callback(new Error("Not allowed by CORS"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Static files for uploaded assets (served at /uploads/…)
app.use("/uploads", express.static(uploadDir));

// Routes
const userRoutes = require("./routes/UserRoutes");
const taskRoutes = require("./routes/TaskRoutes");

app.get("/", (_req, res) => {
  res.send("Server and MongoDB connected successfully 🚀");
});

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

// --- Startup log (confirm FRONTEND_URL loaded) ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("🔗 FRONTEND_URL =", process.env.FRONTEND_URL);
});
