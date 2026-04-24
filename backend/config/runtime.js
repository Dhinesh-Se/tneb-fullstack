const getJwtSecret = () => {
  const secret =
    process.env.JWT_SECRET || process.env.JWT_KEY || process.env.JWT_SECRET_KEY;

  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "dev_only_change_me";
  }

  throw new Error("JWT secret missing. Set JWT_SECRET (or JWT_KEY / JWT_SECRET_KEY).");
};

const getJwtExpiresIn = () =>
  process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRES || process.env.JWT_TTL || "24h";

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
};
