# OnTime — Deployment & Firebase Configuration Guide

This guide outlines how to configure Firebase Cloud Firestore and deploy the OnTime application to cloud hosting platforms (**Vercel** for Frontend, **Render** for Backend, and **Google Cloud Firestore** for Database).

---

## 1. Firebase Firestore Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase Project (e.g., `ontime-college`).
3. In the left sidebar, navigate to **Build** → **Firestore Database** and click **Create Database**.
4. Choose your database location and select **Production mode**.
5. Generate a Service Account Private Key:
   - Go to **Project Settings** (gear icon) → **Service accounts** tab.
   - Click **Generate new private key** and download the `.json` file.
   - ⚠️ **NEVER commit this JSON file to GitHub or public repositories.**

---

## 2. Backend Environment Variables (Render / Cloud Host)

When hosting the Express backend (e.g., on [Render](https://render.com)):

| Environment Variable | Description / Sample Value |
|----------------------|----------------------------|
| `PORT` | `5000` (or host provided port) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-ontime-app.vercel.app` (allowed CORS origin) |
| `JWT_SECRET` | `your_strong_random_jwt_secret_phrase_2026` |
| `JWT_EXPIRES_IN` | `7d` |
| `FIREBASE_PROJECT_ID` | `your-firebase-project-id` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\nMIIEvgI...-----END PRIVATE KEY-----\n"` *(wrap in quotes)* |
| `PAYMENT_MODE` | `test` (or `live`) |
| `PAYMENT_KEY_ID` | Razorpay Key ID |
| `PAYMENT_KEY_SECRET` | Razorpay Key Secret |

> **Note on Local Development**: Without any Firebase credentials configured, OnTime automatically uses its built-in persistent local Firestore provider (`backend/src/db/firestore_local_data.json`), allowing offline local testing with zero friction.

---

## 3. Backend Deployment (Render)

1. Connect your repository to Render as a **Web Service**.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Under **Environment Variables**, fill in the variables listed above.

---

## 4. Frontend Deployment (Vercel)

1. Connect your repository to [Vercel](https://vercel.com).
2. **Framework Preset**: `Vite`
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Under **Environment Variables**, configure:
   - `VITE_API_URL` = `https://<your-render-backend-url>/api`
7. Click **Deploy**. SPA routing rewrite rules are pre-configured in `frontend/vercel.json`.

---

## 5. Safe Local Data Seeding & Migration Commands

From the `backend` directory:
- To verify all Firestore workflows: `npm run verify`
- To re-seed initial data to Firestore: `npm run seed`
- To migrate PostgreSQL data to Firestore: `npm run migrate`
- To access local PostgreSQL backup: `npm run migrate:pg` and `npm run seed:pg`
