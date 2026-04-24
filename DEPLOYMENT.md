# Deployment Runbook (Frontend + Backend)

This runbook gives exact steps to publish both services.

## Option A (Recommended): Vercel + Vercel

Create **two Vercel projects** from the same Git repository:

1. **Backend project**
   - Root Directory: `backend`
   - Framework preset: Other
   - Build settings: default
   - Required environment variables:
     - `MONGO_URI` = your Railway `MONGO_PUBLIC_URL`
     - `MONGO_DB_NAME` = `tneb_db`
     - `JWT_SECRET` = output from `cd backend && npm run generate:jwt-secret`
     - `JWT_EXPIRES_IN` = `24h`
     - `CLIENT_URL` = frontend Vercel domain (for CORS)
     - `ALLOW_ALL_ORIGINS` = `false` (set `true` only for first smoke test)

2. **Frontend project**
   - Root Directory: `frontend`
   - Framework preset: Create React App
   - Required environment variables:
     - `REACT_APP_API_URL` = backend Vercel URL (example: `https://<backend>.vercel.app`)

### Post-deploy checks
- Backend health: `GET https://<backend>.vercel.app/health`
- Backend auth route should respond (not 404): `POST https://<backend>.vercel.app/api/auth/login`
- Frontend loads and login page reaches backend API.

---

## Option B: Netlify + Netlify

Create **two Netlify sites** from the same repository:

1. **Backend site**
   - Base directory: `backend`
   - Netlify file used: `backend/netlify.toml`
   - Environment variables: same as backend Vercel section.
   - Public API base URL:
     - `https://<backend-site>.netlify.app/.netlify/functions/api`

2. **Frontend site**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `build`
   - Environment variables:
     - `REACT_APP_API_URL` = backend Netlify functions URL above

### Post-deploy checks
- Backend health: `GET https://<backend-site>.netlify.app/.netlify/functions/api/health`
- Frontend can log in and fetch consumers.

---

## Safety notes
- Rotate secrets if shared in screenshots.
- Keep `ALLOW_ALL_ORIGINS=false` after initial validation.
- Run env check before deployment:

```bash
cd backend
npm run check:env
```


## CI/CD auto-linking (frontend API URL auto-update)

A GitHub Actions workflow is included at `.github/workflows/vercel-monorepo-deploy.yml`.

What it does:
1. Deploys backend first.
2. Captures deployed backend URL.
3. Writes that URL into `frontend/.env.production` as `REACT_APP_API_URL`.
4. Builds and deploys frontend using that exact backend URL.

Required GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_BACKEND_PROJECT_ID`
- `VERCEL_FRONTEND_PROJECT_ID`

If any secret is missing, workflow now fails early with a clear message (for example: `Missing VERCEL_TOKEN secret`).

This removes manual URL replacement in every deploy.


## CI/CD auto-linking for Netlify

A GitHub Actions workflow is included at `.github/workflows/netlify-monorepo-deploy.yml`.

What it does:
1. Deploys backend Netlify site first.
2. Reads deployed backend site URL from Netlify CLI JSON output.
3. Sets frontend `REACT_APP_API_URL` to `<backend-site>/.netlify/functions/api`.
4. Builds and deploys frontend site.

Required GitHub Secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_BACKEND_SITE_ID`
- `NETLIFY_FRONTEND_SITE_ID`
