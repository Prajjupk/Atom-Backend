const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Task = require("../models/Task");
const {
  createTask,
  getTasks,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require("../controllers/TaskController");

// ✅ Import your central Auth Middleware (fixes role detection)
const { protect, restrictTo } = require("../middleware/authMiddleware");

const router = express.Router();

/* ---------- Multer (absolute path) ---------- */
const uploadsRoot = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

/* ---------- Task CRUD ---------- */
// 🧩 Admin + Manager → Can Create Tasks
router.post("/", protect, restrictTo("Admin", "Manager"), createTask);

// 🧩 Everyone → Can View (based on role)
router.get("/", protect, getTasks);

// 🧩 Admin + Manager → Can Edit Task
router.put("/:id", protect, restrictTo("Admin", "Manager"), updateTask);

// 🧩 Employee → Can Update Status
router.patch("/:id/status", protect, updateTaskStatus);

// 🧩 Admin + Manager → Can Delete
router.delete("/:id", protect, restrictTo("Admin", "Manager"), deleteTask);

/* ---------- Analytics (unchanged but protected) ---------- */
router.get("/analytics", protect, async (_req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "name email role").lean();
    res.json(tasks || []);
  } catch (err) {
    console.error("Error fetching analytics data:", err);
    res.status(500).json({ message: "Error fetching analytics data" });
  }
});

/* ---------- Upload file ---------- */
router.post("/:id/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const webPath = path.posix.join("uploads", req.file.filename);

    const fileData = {
      fileName: req.file.originalname,
      filePath: webPath,
      uploadedAt: new Date(),
      uploadedBy: req.user?.id || null,
    };

    task.attachments = task.attachments || [];
    task.attachments.push(fileData);
    await task.save();

    res.status(200).json({ message: "✅ File uploaded successfully", attachment: fileData });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: "Error uploading file" });
  }
});

/* ---------- List files for a task ---------- */
router.get("/:id/files", protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "attachments.uploadedBy",
      "name email"
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task.attachments || []);
  } catch (err) {
    console.error("❌ Get files error:", err);
    res.status(500).json({ message: "Error fetching files", error: err });
  }
});

/* ---------- Delete a file from a task ---------- */
router.delete("/:id/files/:filename", protect, restrictTo("Admin", "Manager"), async (req, res) => {
  try {
    const { id, filename } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const index = (task.attachments || []).findIndex((a) => a.filePath.endsWith(filename));
    if (index === -1) return res.status(404).json({ message: "File not found" });

    const absolutePath = path.join(__dirname, "..", task.attachments[index].filePath);
    try {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    } catch (e) {
      console.warn("⚠️ Could not delete file from disk:", absolutePath, e.message);
    }

    task.attachments.splice(index, 1);
    await task.save();

    res.json({ message: "🗑 File deleted successfully" });
  } catch (err) {
    console.error("❌ Delete file error:", err);
    res.status(500).json({ message: "Error deleting file" });
  }
});

module.exports = router;
