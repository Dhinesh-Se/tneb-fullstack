const express = require("express");
const Consumption = require("../models/Consumption");
const Consumer = require("../models/Consumer");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// ─────────────────────────────────────────────────
// GET /api/consumption  — all records (ADMIN + MANAGER)
// ─────────────────────────────────────────────────
router.get("/", authenticate, authorize("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { status, consumptionNo, from, to } = req.query;
    const filter = {};
    if (status)        filter.paymentStatus = status.toUpperCase();
    if (consumptionNo) filter.consumptionNo = consumptionNo.trim();
    if (from || to) {
      filter.billDate = {};
      if (from) filter.billDate.$gte = new Date(from);
      if (to)   filter.billDate.$lte = new Date(to);
    }
    const records = await Consumption.find(filter).sort({ billDate: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch consumption records" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/consumption/by-number/:consumptionNo  — public (billing details page)
// ─────────────────────────────────────────────────
router.get("/by-number/:consumptionNo", async (req, res) => {
  try {
    const records = await Consumption.find({
      consumptionNo: req.params.consumptionNo.trim(),
    }).sort({ billDate: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────
// GET /api/consumption/stats  — dashboard aggregate stats (MANAGER + ADMIN)
// ─────────────────────────────────────────────────
router.get("/stats/summary", authenticate, authorize("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const [paymentAgg, monthlyAgg, consumerCount] = await Promise.all([
      // Payment status totals
      Consumption.aggregate([
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            totalUnits: { $sum: "$unitsConsumed" },
          },
        },
      ]),
      // Monthly revenue last 12 months
      Consumption.aggregate([
        {
          $match: {
            billDate: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$billDate" },
              month: { $month: "$billDate" },
            },
            revenue: { $sum: "$amount" },
            units: { $sum: "$unitsConsumed" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Consumer.countDocuments({ isActive: true }),
    ]);

    // Reshape payment data
    const paid   = paymentAgg.find((r) => r._id === "PAID")   || { count: 0, totalAmount: 0, totalUnits: 0 };
    const unpaid = paymentAgg.find((r) => r._id === "UNPAID") || { count: 0, totalAmount: 0, totalUnits: 0 };

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthly = monthlyAgg.map((m) => ({
      label: `${monthNames[m._id.month - 1]} '${String(m._id.year).slice(-2)}`,
      revenue: m.revenue,
      units: m.units,
      count: m.count,
    }));

    res.json({
      totalConsumers: consumerCount,
      paidCount:    paid.count,
      unpaidCount:  unpaid.count,
      paidAmount:   paid.totalAmount,
      unpaidAmount: unpaid.totalAmount,
      totalUnits:   paid.totalUnits + unpaid.totalUnits,
      monthly,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// ─────────────────────────────────────────────────
// POST /api/consumption  — add consumption record (ADMIN only)
// ─────────────────────────────────────────────────
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { ConsumptionNo, consumptionNo, UnitsConsumed, unitsConsumed,
            BillDate, billDate, PaymentStatus, paymentStatus } = req.body;

    const no     = (ConsumptionNo || consumptionNo || "").trim();
    const units  = Number(UnitsConsumed || unitsConsumed);
    const date   = BillDate || billDate;
    const status = (PaymentStatus || paymentStatus || "UNPAID").toString().toUpperCase();

    if (!no)           return res.status(400).json({ message: "Consumption number is required" });
    if (!units || units <= 0) return res.status(400).json({ message: "Valid units consumed required" });
    if (!date)         return res.status(400).json({ message: "Bill date is required" });

    // Verify consumer exists
    const consumer = await Consumer.findOne({ consumptionNo: no, isActive: true });
    if (!consumer)
      return res.status(404).json({ message: `No active consumer found with consumption no: ${no}` });

    const record = new Consumption({
      consumptionNo: no,
      unitsConsumed: units,
      billDate: new Date(date),
      paymentStatus: status,
    });
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map((e) => e.message).join("; ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: "Failed to save consumption record" });
  }
});

// ─────────────────────────────────────────────────
// PATCH /api/consumption/:id/pay  — mark as paid (ADMIN only)
// ─────────────────────────────────────────────────
router.patch("/:id/pay", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const record = await Consumption.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: "PAID", paidAt: new Date() },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to update payment status" });
  }
});

// ─────────────────────────────────────────────────
// PUT /api/consumption/:id  — update record (ADMIN only)
// ─────────────────────────────────────────────────
router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { UnitsConsumed, unitsConsumed, BillDate, billDate, PaymentStatus, paymentStatus } = req.body;
    const update = {};
    const u = UnitsConsumed || unitsConsumed;
    const d = BillDate      || billDate;
    const s = PaymentStatus || paymentStatus;

    if (u) { update.unitsConsumed = Number(u); update.amount = Number(u) * 5; }
    if (d) update.billDate = new Date(d);
    if (s) {
      update.paymentStatus = s.toString().toUpperCase();
      if (update.paymentStatus === "PAID") update.paidAt = new Date();
    }

    const record = await Consumption.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to update record" });
  }
});

// ─────────────────────────────────────────────────
// DELETE /api/consumption/:id  (ADMIN only)
// ─────────────────────────────────────────────────
router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const record = await Consumption.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete record" });
  }
});

module.exports = router;
