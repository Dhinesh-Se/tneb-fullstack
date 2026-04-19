const mongoose = require("mongoose");

let connectPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set. Skipping MongoDB connection.");
    return false;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then((conn) => {
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return true;
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      connectPromise = null;
      return false;
    });

  return connectPromise;
};

module.exports = connectDB;
