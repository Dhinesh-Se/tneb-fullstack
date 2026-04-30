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
  const user = process.env.MONGOUSER || process.env.MONGO_INITDB_ROOT_USERNAME;
  const password = process.env.MONGOPASSWORD || process.env.MONGO_INITDB_ROOT_PASSWORD;

  if (host && user && password) {
    const raw = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}`;
    return ensureDbNameInUri(raw);
  }

  return null;
};

const getMongooseOptions = () => {
  return {
    // Connection timeouts
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_TIMEOUT || "5000"),
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || "45000"),
    
    // Connection pooling (optimized for production and Railway)
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL || "10"),
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL || "2"),
    
    // SSL/TLS configuration (disabled for Railway proxy)
    ssl: false,
    tls: false,
    
    // Authentication - root user must auth against admin database
    authSource: 'admin',
    
    // Disable features that don't work on single-instance MongoDB
    retryWrites: false,
    
    // Reconnection strategy
    family: 4, // Use IPv4 explicitly
  };
};

const connectDB = async () => {
  // Return existing connection if already connected
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

  // Return existing promise if connection is in progress
  if (connectPromise) {
    return connectPromise;
  }

  const mongoOptions = getMongooseOptions();
  
  // Log connection attempt (without exposing password)
  const sanitizedUri = mongoUri.replace(/:[^:@]+@/, ':***@');
  console.log(`🔄 Connecting to MongoDB: ${sanitizedUri}`);
  console.log(`📊 Options:`, { 
    maxPoolSize: mongoOptions.maxPoolSize,
    minPoolSize: mongoOptions.minPoolSize,
    serverSelectionTimeoutMS: mongoOptions.serverSelectionTimeoutMS
  });

  connectPromise = mongoose
    .connect(mongoUri, mongoOptions)
    .then((conn) => {
      console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      
      // Setup connection event listeners
      conn.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });
      
      conn.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        connectPromise = null;
      });
      
      return true;
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      console.error("📍 Connection string:", sanitizedUri);
      connectPromise = null;
      return false;
    });

  return connectPromise;
};

module.exports = connectDB;
