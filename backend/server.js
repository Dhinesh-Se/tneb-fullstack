const app = require("./app");

const PORT = process.env.PORT || 5292;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TNEB Backend running on port ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/health`);
    console.log(`🔑 Seed accounts: POST http://localhost:${PORT}/api/auth/seed`);
  });
}

module.exports = app;
