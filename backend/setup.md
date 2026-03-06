# Backend setup (Firebase)

## Requirements
- Node.js 18+
- Firebase CLI: `npm i -g firebase-tools`

## Install
```bash
cd backend
npm install
cd functions
npm install
cd ..
```

## Run locally (emulators)
```bash
cd backend
firebase emulators:start
```

Seed emulator data:
```bash
cd backend
node scripts/seedEmulator.js
```

Your Functions API will be available at:

`http://localhost:5001/<PROJECT_ID>/us-central1/api`

## Deploy
```bash
cd backend
firebase use <your-project-id>
firebase deploy --only firestore,functions
```
