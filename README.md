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

### Backend → Vercel

1. Push the `backend/` folder to a GitHub repo (or a subfolder)
2. Create a new Vercel project → import repo
3. Set **Root Directory** to `backend`
4. Add Environment Variables in Vercel dashboard:
   - `MONGO_URI` → your Atlas connection string
   - `JWT_SECRET` → a strong random string
   - `JWT_EXPIRES_IN` → `24h`
   - `CLIENT_URL` → your frontend Vercel/Netlify URL
5. Deploy — Vercel uses `vercel.json` automatically

### Backend → Netlify (Functions)
Not recommended for Express. Use Vercel, Railway, or Render instead.

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. New Vercel project → import → set Root Directory to `frontend`
3. Add Environment Variable:
   - `REACT_APP_API_URL` → your deployed backend URL (e.g. `https://tneb-api.vercel.app`)
4. Deploy — `vercel.json` handles SPA routing

### Frontend → Netlify

1. Connect repo, set base directory to `frontend`, build command `npm run build`, publish `build`
2. Add env var `REACT_APP_API_URL`
3. `netlify.toml` handles SPA redirects automatically

---

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
