const mongoose = require("mongoose");

let connectPromise = null;

const ensureDbNameInUri = (uri) => {
  if (!uri) return uri;

  const dbName =
    process.env.MONGO_DB_NAME ||
    process.env.MONGO_DATABASE ||
    process.env.MONGO_INITDB_DATABASE ||
    "tneb_db";

  // Keep existing DB segment untouched (e.g. mongodb://host/mydb)
  const hasDbSegment = /mongodb(\+srv)?:\/\/[^/]+\/.+/.test(uri);
  if (hasDbSegment) return uri;

  // Insert DB segment before query string when only host is provided
  const queryIndex = uri.indexOf("?");
  if (queryIndex === -1) return `${uri}/${dbName}`;

  const base = uri.slice(0, queryIndex);
  const query = uri.slice(queryIndex);
  return `${base}/${dbName}${query}`;
};

const getMongoUri = () => {
  const directUri = process.env.MONGO_URI;
  const railwayPublic = process.env.MONGO_PUBLIC_URL;
  const railwayInternal = process.env.MONGO_URL;

  const selected = directUri || railwayPublic || railwayInternal;
  if (selected) return ensureDbNameInUri(selected);

  const host = process.env.MONGOHOST;
  const port = process.env.MONGOPORT || "27017";
  const user = process.env.MONGOUSER;
  const password = process.env.MONGOPASSWORD;

  if (host && user && password) {
    const raw = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`;
    return ensureDbNameInUri(raw);
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
      console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
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
