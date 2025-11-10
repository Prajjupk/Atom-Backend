const fs = require("fs");
const path = require("path");
const Task = require("../models/Task");
const User = require("../models/User");

// ➕ Create Task
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, deadline, priority } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      if (!assignee || assignee.role !== "Employee")
        return res.status(400).json({ message: "Assignee must be an Employee" });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo: assignedTo || null,
      deadline,
      priority,
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 📜 Get Tasks
const getTasks = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "Employee") filter = { assignedTo: req.user.id };
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email")
      .populate("attachments.uploadedBy", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✏️ Update Task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Task.findByIdAndUpdate(id, req.body, { new: true }).populate(
      "assignedTo",
      "name email"
    );
    if (!updated) return res.status(404).json({ message: "Task not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🔄 Update Status
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (req.user.role === "Employee") {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user.id)
        return res.status(403).json({ message: "Not allowed" });
    }

    task.status = status || task.status;
    await task.save();
    const populated = await task.populate("assignedTo", "name email");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 📂 Upload File
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const fileData = {
      fileName: req.file.originalname,
      filePath: path.posix.join("uploads", req.file.filename),
      uploadedBy: req.user.id,
    };

    task.attachments.push(fileData);
    await task.save();

    res.status(200).json({ message: "✅ File uploaded successfully", file: fileData });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading file", error });
  }
};

// 📑 Get All Files for a Task
const getFiles = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate("attachments.uploadedBy", "name email");
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task.attachments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching files", error });
  }
};

// ❌ Delete a File
const deleteFile = async (req, res) => {
  try {
    const { id, filename } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const fileIndex = task.attachments.findIndex((a) => a.filePath.endsWith(filename));
    if (fileIndex === -1) return res.status(404).json({ message: "File not found" });

    const filePath = path.join(__dirname, "..", task.attachments[fileIndex].filePath);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    task.attachments.splice(fileIndex, 1);
    await task.save();

    res.json({ message: "🗑 File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Error deleting file", error });
  }
};

// 🗑 Delete Task
const deleteTask = async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "✅ Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  updateTaskStatus,
  deleteTask,
  uploadFile,
  getFiles,
  deleteFile,
};
