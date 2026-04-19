const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const consumerSchema = new mongoose.Schema(
  {
    consumptionNo: {
      type: String,
      unique: true,
      default: () => "TNEB" + Date.now().toString().slice(-8),
    },
    consumerName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Phone must be 10 digits starting with 6-9"],
    },
    wardNo: { type: String, required: true, trim: true },
    consumerType: {
      type: String,
      enum: ["Domestic", "Commercial", "Industrial", "Agricultural"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Case-insensitive index for search
consumerSchema.index({ consumerName: "text", consumptionNo: 1 });

module.exports = mongoose.model("Consumer", consumerSchema);
