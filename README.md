# BeautyBooking (MVP)

This repo contains a **Firebase (Cloud Functions + Firestore)** backend and a minimal **Expo React Native** mobile client scaffold.

> **Note:** `node_modules/` are intentionally not included. Install deps before running.

## Structure

- `backend/` – Firebase project (Firestore rules/indexes + Cloud Functions)
- `mobile/` – Expo app scaffold (React Native)

## Prerequisites

- Node.js 18+
- Firebase CLI: `npm i -g firebase-tools`
- A Firebase project (for deploy) or Firebase Emulator Suite (for local)

## Local development (recommended)

### 1) Backend (emulators)

```bash
cd backend
npm install
cd functions
npm install
cd ..

# Start emulators (Functions + Firestore + UI)
firebase emulators:start
```

In another terminal, seed the emulator with sample data:

```bash
cd backend
node scripts/seedEmulator.js
```

### 2) Mobile (Expo)

```bash
cd mobile
npm install
npm run start
```

Set your mobile app config:
- Copy `mobile/.env.example` to `mobile/.env`
- Fill in your Firebase web config values (from Firebase Console)
- For emulator mode, keep API base URL as `http://localhost:5001/<PROJECT_ID>/<REGION>/api`

## Deploy

```bash
cd backend
firebase use <your-project-id>
firebase deploy --only firestore,functions
```

## API

The backend exports a single HTTPS function:

- Base path: `/api`
- Health check: `GET /api/health`

Key endpoints:
- `GET /api/users/me`
- `PUT /api/users/me`
- `POST /api/users/me/favourites`
- `GET /api/providers`
- `GET /api/providers/:id`
- `POST /api/bookings`
- `GET /api/bookings`
- `PATCH /api/bookings/:id/status`

All non-public endpoints require `Authorization: Bearer <Firebase ID token>`.
