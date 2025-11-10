const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// 🔑 JWT Sign
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// 🧾 Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 8);
    const newUser = await User.create({ name, email, password: hashed, role });
    res.status(201).json({ message: "✅ Registered", userId: newUser._id });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error", err });
  }
});

// 🔐 Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.status(200).json({
      message: "✅ Login successful",
      token,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error", err });
  }
});

// 📜 GET ALL USERS — ADMIN ONLY
router.get("/", protect, restrictTo("Admin"), async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// 🧑‍💼 GET EMPLOYEES — ADMIN / MANAGER
router.get("/employees", protect, restrictTo("Admin", "Manager"), async (_req, res) => {
  try {
    const employees = await User.find({ role: "Employee" }).select("_id name email role");
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: "Error fetching employees", err });
  }
});

// 🗑️ DELETE USER — ADMIN ONLY
router.delete("/:id", protect, restrictTo("Admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user", err });
  }
});

// ✏️ UPDATE USER ROLE — ADMIN ONLY
router.patch("/:id/role", protect, restrictTo("Admin"), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error updating role", err });
  }
});

module.exports = router;
