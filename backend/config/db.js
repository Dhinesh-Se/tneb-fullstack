const mongoose = require("mongoose");

let connectPromise = null;

const getMongoUri = () => {
  const directUri = process.env.MONGO_URI;
  const railwayPublic = process.env.MONGO_PUBLIC_URL;
  const railwayInternal = process.env.MONGO_URL;

  if (directUri) return directUri;
  if (railwayPublic) return railwayPublic;
  if (railwayInternal) return railwayInternal;

  const host = process.env.MONGOHOST;
  const port = process.env.MONGOPORT || "27017";
  const user = process.env.MONGOUSER;
  const password = process.env.MONGOPASSWORD;

  if (host && user && password) {
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`;
  }

  return null;
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.error(
      "❌ Mongo connection string missing. Set MONGO_URI (or Railway MONGO_PUBLIC_URL/MONGO_URL)."
    );
    return false;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = mongoose
    .connect(mongoUri, {
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
