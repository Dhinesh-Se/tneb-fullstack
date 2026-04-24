/* eslint-disable no-console */
const hasMongoUri = Boolean(
  process.env.MONGO_URI ||
    process.env.MONGO_PUBLIC_URL ||
    process.env.MONGO_URL ||
    (process.env.MONGOHOST && process.env.MONGOUSER && process.env.MONGOPASSWORD)
);

const checks = [
  {
    name: "JWT_SECRET",
    ok: Boolean(process.env.JWT_SECRET),
    help: "Set a long random string in hosting dashboard.",
  },
  {
    name: "Mongo connection",
    ok: hasMongoUri,
    help: "Set MONGO_URI (recommended) or Railway MONGO_PUBLIC_URL/MONGO_URL.",
  },
  {
    name: "CLIENT_URL / ALLOW_ALL_ORIGINS",
    ok: Boolean(process.env.CLIENT_URL) || process.env.ALLOW_ALL_ORIGINS === "true",
    help: "Set CLIENT_URL to frontend URL, or temporarily ALLOW_ALL_ORIGINS=true.",
  },
];

let hasFailure = false;
console.log("\nTNEB backend environment validation\n");
for (const check of checks) {
  const icon = check.ok ? "✅" : "❌";
  console.log(`${icon} ${check.name}`);
  if (!check.ok) {
    hasFailure = true;
    console.log(`   ↳ ${check.help}`);
  }
}

if (hasFailure) {
  console.error("\nEnvironment validation failed.");
  process.exit(1);
}

console.log("\nEnvironment validation passed.");
