const mongoose = require("mongoose");

const RATE_PER_UNIT = 5; // ₹5 per kWh — change as needed

const consumptionSchema = new mongoose.Schema(
  {
    consumptionNo: {
      type: String,
      required: true,
      ref: "Consumer",
    },
    unitsConsumed: {
      type: Number,
      required: true,
      min: [0.01, "Units must be positive"],
    },
    amount: {
      type: Number,
    },
    billDate: {
      type: Date,
      required: true,
    },
    recordedDate: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "UNPAID"],
      default: "UNPAID",
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Auto-calculate amount before saving
consumptionSchema.pre("save", function (next) {
  if (this.isModified("unitsConsumed") || this.isNew) {
    this.amount = parseFloat((this.unitsConsumed * RATE_PER_UNIT).toFixed(2));
  }
  if (this.paymentStatus === "PAID" && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

consumptionSchema.index({ consumptionNo: 1 });
consumptionSchema.index({ billDate: -1 });
consumptionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Consumption", consumptionSchema);
