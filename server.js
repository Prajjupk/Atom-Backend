const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Import Routes
const userRoutes = require("./routes/UserRoutes");
const taskRoutes = require("./routes/TaskRoutes");

// Base route
app.get("/", (req, res) => {
  res.send("Server and MongoDB connected successfully 🚀");
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
