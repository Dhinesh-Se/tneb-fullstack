# TNEB Backend API

Node.js + Express + MongoDB REST API for the TNEB Consumer Billing System.

## Quick Start

```bash
npm install
cp .env.example .env    # fill in MONGO_URI and JWT_SECRET
npm run dev             # development with nodemon
npm start               # production
```

## Seed default users
```bash
curl -X POST http://localhost:5292/api/auth/seed
```
| adminId   | password  | role    |
|-----------|-----------|---------|
| admin001  | Admin@123 | ADMIN   |
| mgr001    | Mgr@1234  | MANAGER |

## Health check
```
GET /health
```

## Deployment targets

## Validate environment before deploy
```bash
npm run check:env
```

- **Vercel:** uses `vercel.json`, entrypoint `app.js`
- **Netlify:** uses `netlify/functions/api.js` + `netlify.toml`

See root `README.md` for full API reference and deployment instructions.


Set environment variables from the Vercel/Netlify dashboard.
Railway Mongo vars also work: `MONGO_PUBLIC_URL` / `MONGO_URL` (fallback when `MONGO_URI` is not set).
If Mongo URL has no database name, set `MONGO_DB_NAME=tneb_db` (backend auto-appends it).
For first deployment checks only, you can set `ALLOW_ALL_ORIGINS=true`, then lock down `CLIENT_URL`.

Generate a strong JWT secret:
```bash
npm run generate:jwt-secret
```
