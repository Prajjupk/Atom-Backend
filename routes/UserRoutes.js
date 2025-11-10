const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🔑 Sign JWT
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// 🧾 REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // ⚡ bcrypt with async + optimized rounds (8 is secure enough)
    const hashed = await bcrypt.hash(password, 8);
    const newUser = await User.create({ name, email, password: hashed, role });

    res
      .status(201)
      .json({ message: "✅ User registered successfully", userId: newUser._id });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔐 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // ⚡ Fast bcrypt compare (asynchronous + non-blocking)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user);

    // ✅ Send minimal payload
    return res.status(200).json({
      message: "✅ Login successful",
      token,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📜 GET ALL USERS (Admin only)
router.get("/", async (_req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// 🧑‍💼 GET EMPLOYEES (Admin or Manager)
router.get("/employees", async (_req, res) => {
  try {
    const employees = await User.find({ role: "Employee" }).select("_id name email");
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});

// 🗑️ DELETE USER (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting user" });
  }
});

// ✏️ UPDATE USER ROLE (Admin only)
router.patch("/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "Error updating role" });
  }
});

module.exports = router;
