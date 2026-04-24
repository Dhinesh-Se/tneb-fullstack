# TNEB Consumer Billing Management System
### Tamil Nadu Electricity Board — Full-Stack Application

---

## 📁 Project Structure

```
tneb-fullstack/
├── backend/          ← Node.js + Express + MongoDB API
│   ├── config/       ← DB connection
│   ├── middleware/   ← JWT authentication
│   ├── models/       ← Mongoose schemas (Admin, Consumer, Consumption)
│   ├── routes/       ← REST API routes
│   ├── server.js     ← Entry point
│   ├── vercel.json   ← Vercel deployment config
│   └── .env.example  ← Environment variable template
│
└── frontend/         ← React application (Create React App)
    ├── src/
    │   ├── components/   ← All UI components including new Dashboard
    │   ├── redux/        ← Redux Toolkit store & slices
    │   └── api.js        ← Axios instance
    ├── netlify.toml      ← Netlify config
    └── vercel.json       ← Vercel config
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com) free tier)

### 1. Start the Backend

```bash
cd backend
npm install

# Copy env template and fill in values
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET

npm run dev       # starts on port 5292 with nodemon
```

**Seed default users** (run once after first start):
```bash
curl -X POST http://localhost:5292/api/auth/seed
```
This creates:
| User ID   | Password   | Role    |
|-----------|------------|---------|
| admin001  | Admin@123  | ADMIN   |
| mgr001    | Mgr@1234   | MANAGER |

### 2. Start the Frontend

```bash
cd frontend
npm install

# Set backend URL
echo "REACT_APP_API_URL=http://localhost:5292" > .env

npm start         # starts on port 3000
```

---

## 🌐 Deployment

You can deploy **both frontend and backend** on either **Vercel** or **Netlify**.

### Option A — Deploy both on Vercel (recommended)

#### Backend (Vercel)
1. In Vercel, create a project from this repo.
2. Set **Root Directory** to `backend`.
3. Add environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN` (example: `24h`)
   - `CLIENT_URL` (your frontend production URL)
4. Deploy. The `backend/vercel.json` routes requests to `app.js`.
5. In the Vercel project settings, add the environment variables directly (do not use missing secret aliases like `@mongo_uri`).

#### Frontend (Vercel)
1. Create a second Vercel project from the same repo.
2. Set **Root Directory** to `frontend`.
3. Add env var:
   - `REACT_APP_API_URL` = your backend URL (example: `https://your-backend.vercel.app`)
4. Deploy. `frontend/vercel.json` handles SPA rewrites.

---

### Option B — Deploy both on Netlify

#### Backend (Netlify Functions)
1. In Netlify, create a new site from this repo.
2. Set **Base directory** to `backend`.
3. Netlify reads `backend/netlify.toml` and deploys Express as a Function at:
   - `/.netlify/functions/api/*`
4. Add environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN` (example: `24h`)
   - `CLIENT_URL` (your frontend production URL)

**Backend URL tip:** your public API base becomes:
- `https://<your-site>.netlify.app/.netlify/functions/api`

So frontend should use:
- `REACT_APP_API_URL=https://<your-site>.netlify.app/.netlify/functions/api`

#### Frontend (Netlify)
1. Create another Netlify site from the same repo.
2. Set **Base directory** to `frontend`.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
4. Add env var:
   - `REACT_APP_API_URL` = deployed backend URL
5. Deploy. `frontend/netlify.toml` handles SPA redirects.

---

### CORS checklist (important)
- Set backend `CLIENT_URL` to the exact frontend domain.
- If you use multiple frontend domains, separate them with commas.
  - Example: `https://app1.vercel.app,https://app2.netlify.app`
- For first-time go-live debugging, you can temporarily set `ALLOW_ALL_ORIGINS=true`, then switch back to restricted mode.

### Troubleshooting
- If Vercel shows `FUNCTION_INVOCATION_FAILED`, verify backend env vars are set in project settings (especially `MONGO_URI` and `JWT_SECRET`).
- If you use Railway Mongo plugin vars, backend accepts `MONGO_PUBLIC_URL` / `MONGO_URL` automatically and will append `MONGO_DB_NAME` when URL has no database segment.
- `/health` now returns `dbState` so you can quickly confirm whether `MONGO_URI` is configured.

## 📡 API Reference

### Auth
| Method | Endpoint                    | Access  | Description             |
|--------|-----------------------------|---------|-------------------------|
| POST   | /api/auth/login             | Public  | Login, returns JWT      |
| POST   | /api/auth/seed              | Public  | Create default accounts |
| GET    | /api/auth/me                | Auth    | Current user info       |
| POST   | /api/auth/change-password   | Auth    | Change password         |

### Consumers
| Method | Endpoint                    | Access        | Description             |
|--------|-----------------------------|---------------|-------------------------|
| GET    | /api/consumer               | ADMIN/MANAGER | List all consumers      |
| GET    | /api/consumer/:consumptionNo| Public        | Single consumer (billing page) |
| POST   | /api/consumer               | ADMIN         | Create consumer         |
| PUT    | /api/consumer/:id           | ADMIN         | Update consumer         |
| DELETE | /api/consumer/:id           | ADMIN         | Soft-delete consumer    |

### Consumption / Billing
| Method | Endpoint                           | Access        | Description              |
|--------|------------------------------------|---------------|--------------------------|
| GET    | /api/consumption                   | ADMIN/MANAGER | All records              |
| GET    | /api/consumption/by-number/:no     | Public        | Records by consumption no|
| GET    | /api/consumption/stats/summary     | ADMIN/MANAGER | Aggregated dashboard stats|
| POST   | /api/consumption                   | ADMIN         | Add record               |
| PATCH  | /api/consumption/:id/pay           | ADMIN         | Mark as paid             |
| PUT    | /api/consumption/:id               | ADMIN         | Update record            |
| DELETE | /api/consumption/:id               | ADMIN         | Delete record            |

---

## 🔐 Roles

| Role    | Access                                          |
|---------|-------------------------------------------------|
| ADMIN   | Full access — consumers, consumption, all pages |
| MANAGER | Dashboard + Bill Calculator + Billing Details   |

---

## 🛡️ Security Notes

- Change `JWT_SECRET` to a long random string in production
- Remove or protect the `/api/auth/seed` endpoint after initial setup
- Use HTTPS for both frontend and backend in production
- MongoDB Atlas: restrict network access to your backend IP

---

## ⚡ Tech Stack

**Frontend:** React 18, Redux Toolkit, React Router v6, Chart.js, Axios  
**Backend:** Node.js, Express 4, MongoDB, Mongoose, JWT, bcryptjs  
**Deploy:** Vercel (backend + frontend) or Netlify (frontend)
