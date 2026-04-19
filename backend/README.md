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
- **Vercel:** uses `vercel.json`, entrypoint `app.js`
- **Netlify:** uses `netlify/functions/api.js` + `netlify.toml`

See root `README.md` for full API reference and deployment instructions.
