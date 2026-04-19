const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// ─────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({ message: "adminId and password are required" });
    }

    const admin = await Admin.findOne({ adminId, isActive: true });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin.adminId, role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      token,
      role: admin.role,
      adminId: admin.adminId,
      name: admin.name,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// ─────────────────────────────────────────────────
// POST /api/auth/seed  — creates default admin & manager accounts
// Only run once in development. Remove in production or protect it.
// ─────────────────────────────────────────────────
router.post("/seed", async (req, res) => {
  try {
    const defaults = [
      { adminId: "admin001", password: "Admin@123", role: "ADMIN",   name: "System Admin" },
      { adminId: "mgr001",   password: "Mgr@1234",  role: "MANAGER", name: "District Manager" },
    ];

    const results = [];
    for (const d of defaults) {
      const exists = await Admin.findOne({ adminId: d.adminId });
      if (!exists) {
        const user = new Admin(d);
        await user.save();
        results.push({ adminId: d.adminId, created: true });
      } else {
        results.push({ adminId: d.adminId, created: false, note: "Already exists" });
      }
    }
    res.json({ message: "Seed complete", results });
  } catch (err) {
    res.status(500).json({ message: "Seed failed", error: err.message });
  }
});

// ─────────────────────────────────────────────────
// GET /api/auth/me  — get current user info
// ─────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const admin = await Admin.findOne({ adminId: req.user.adminId }).select("-password");
    if (!admin) return res.status(404).json({ message: "User not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both passwords required" });
    if (newPassword.length < 4)
      return res.status(400).json({ message: "New password must be at least 4 chars" });

    const admin = await Admin.findOne({ adminId: req.user.adminId });
    const ok = await admin.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
