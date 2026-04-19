const express = require("express");
const Consumer = require("../models/Consumer");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// ─────────────────────────────────────────────────
// GET /api/consumer  — list all consumers (ADMIN only)
// ─────────────────────────────────────────────────
router.get("/", authenticate, authorize("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { search, type, ward, page = 1, limit = 200 } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { consumerName: { $regex: search, $options: "i" } },
        { consumptionNo: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (type) filter.consumerType = type;
    if (ward) filter.wardNo = ward;

    const skip = (Number(page) - 1) * Number(limit);
    const [consumers, total] = await Promise.all([
      Consumer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Consumer.countDocuments(filter),
    ]);

    res.json(consumers);
  } catch (err) {
    console.error("GET /consumer error:", err);
    res.status(500).json({ message: "Failed to fetch consumers" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/consumer/:consumptionNo  — single consumer (public for billing details)
// ─────────────────────────────────────────────────
router.get("/:consumptionNo", async (req, res) => {
  try {
    const consumer = await Consumer.findOne({
      consumptionNo: req.params.consumptionNo.trim(),
      isActive: true,
    });
    if (!consumer) return res.status(404).json({ message: "Consumer not found" });
    res.json(consumer);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────
// POST /api/consumer  — create new consumer (ADMIN only)
// ─────────────────────────────────────────────────
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { ConsumerName, consumerName, Address, address, Email, email,
            PhoneNumber, phoneNumber, WardNo, wardNo, ConsumerType, consumerType } = req.body;

    // Accept both PascalCase (legacy) and camelCase field names
    const data = {
      consumerName:  (ConsumerName  || consumerName  || "").trim(),
      address:       (Address       || address       || "").trim(),
      email:         (Email         || email         || "").trim().toLowerCase(),
      phoneNumber:   (PhoneNumber   || phoneNumber   || "").replace(/\D/g, "").slice(-10),
      wardNo:        (WardNo        || wardNo        || "").trim(),
      consumerType:  ConsumerType   || consumerType,
    };

    // Validations
    if (!data.consumerName) return res.status(400).json({ message: "Consumer name is required" });
    if (!data.email)        return res.status(400).json({ message: "Email is required" });
    if (!data.phoneNumber || data.phoneNumber.length !== 10)
      return res.status(400).json({ message: "Valid 10-digit phone number is required" });

    // Check duplicate email
    const emailExists = await Consumer.findOne({ email: data.email, isActive: true });
    if (emailExists)
      return res.status(409).json({ message: "A consumer with this email already exists" });

    const consumer = new Consumer(data);
    await consumer.save();
    res.status(201).json(consumer);
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join("; ");
      return res.status(400).json({ message: msg });
    }
    console.error("POST /consumer error:", err);
    res.status(500).json({ message: "Failed to create consumer" });
  }
});

// ─────────────────────────────────────────────────
// PUT /api/consumer/:id  — update consumer (ADMIN only)
// ─────────────────────────────────────────────────
router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { ConsumerName, consumerName, Address, address, Email, email,
            PhoneNumber, phoneNumber, WardNo, wardNo, ConsumerType, consumerType } = req.body;

    const update = {};
    const n  = ConsumerName  || consumerName;
    const a  = Address       || address;
    const em = Email         || email;
    const ph = PhoneNumber   || phoneNumber;
    const w  = WardNo        || wardNo;
    const ct = ConsumerType  || consumerType;

    if (n)  update.consumerName = n.trim();
    if (a)  update.address      = a.trim();
    if (em) update.email        = em.trim().toLowerCase();
    if (ph) update.phoneNumber  = ph.replace(/\D/g, "").slice(-10);
    if (w)  update.wardNo       = w.trim();
    if (ct) update.consumerType = ct;

    const consumer = await Consumer.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!consumer) return res.status(404).json({ message: "Consumer not found" });
    res.json(consumer);
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join("; ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: "Failed to update consumer" });
  }
});

// ─────────────────────────────────────────────────
// DELETE /api/consumer/:id  — soft delete (ADMIN only)
// ─────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const consumer = await Consumer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!consumer) return res.status(404).json({ message: "Consumer not found" });
    res.json({ message: "Consumer deleted successfully", consumptionNo: consumer.consumptionNo });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete consumer" });
  }
});

module.exports = router;
