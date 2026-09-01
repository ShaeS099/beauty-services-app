# Beauty Booking App — Setup Guide

This project has two parts:
- `backend/` — Firebase (Cloud Functions + Firestore) REST API
- `mobile/` — Expo (React Native) app, run with **Expo Go** (no Xcode/Android Studio needed)

The fastest way to run everything locally is against the **Firebase Emulator Suite** — no real Firebase project or billing account required.

## Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- [Expo Go](https://expo.dev/client) installed on your phone, or an Android/iOS simulator

## 1) Start the backend (emulators)

```bash
cd backend
npm install
cd functions
npm install
cd ..
firebase emulators:start
```

This starts Firestore, Auth and Cloud Functions emulators, plus an Emulator UI at http://localhost:4000.

In a second terminal, seed some sample providers and portfolio posts:

```bash
cd backend
node scripts/seedEmulator.js
```

By default this uses picsum.photos placeholder images and one stock video clip. For real
hair/beauty photos and video (with real thumbnails), get a free key at
[pexels.com/api](https://www.pexels.com/api/) and pass it in instead:

```bash
PEXELS_API_KEY=your-key-here node scripts/seedEmulator.js
```

(On Windows PowerShell: `$env:PEXELS_API_KEY="your-key-here"; node scripts/seedEmulator.js`.) No
key, no problem — the script falls back to the placeholders automatically.

### Running the backend tests

With the emulators running (Auth + Firestore are required; the tests talk to them directly over their REST/Admin SDK interfaces), in a separate terminal:

```bash
cd backend/functions
npm test
```

These are integration tests, not mocked unit tests — they create real users via the Auth emulator and drive the Express app (`booking` double-booking prevention, `review` completion/duplicate gating, `verification` document-path validation) with real Firestore reads/writes. They create their own test data each run and don't touch the seeded sample providers.

## 2) Run the mobile app

```bash
cd mobile
npm install
cp .env.example .env
npm run start
```

Then scan the QR code with Expo Go (or press `a` / `i` for an Android/iOS simulator).

The default `.env` already points at the local emulators (`EXPO_PUBLIC_USE_EMULATORS=true`), so sign-up/sign-in and API calls will hit your local backend — no Firebase project configuration needed for local development.

### Running the mobile tests and linter

```bash
cd mobile
npm test        # jest-expo + React Native Testing Library — booking slot logic, Chip component
npm run lint     # expo lint (flat ESLint config)
```

These don't need the emulators running — the mobile tests are unit/component-level (pure logic in `src/utils/`, one component render/interaction test), not integration tests against the backend.

## 3) Try it out

1. Sign up with any email/password (the Auth emulator doesn't send real emails).
2. Answer the onboarding quiz (pick a few categories/subcategories) — this seeds your personalized feed.
3. Swipe between **Discover** (a Pinterest-style grid, weighted by your quiz picks), **For You** (a TikTok-style vertical feed, weighted by your quiz picks *and* what you like/save/book over time), and **Profile**.
4. Like, save, or comment on a post; tap a business name to open its page.
5. From a business page, pick a service, choose a day/time, and confirm a booking.
6. From Profile, reach Search, My Bookings, and Saved posts, or tap "Become a service provider" to create your own provider profile, services, and (via the seed script) portfolio posts.
7. As a provider, submit identity verification (photo upload) from your provider profile form — it goes into an admin review queue rather than auto-approving.

### Reviewing identity verification submissions (as an admin)

There's no self-service way to become an admin — same philosophy as everything else here (self-attested verification, no paid vendor): open the Emulator UI's Firestore tab at http://localhost:4000/firestore, find your user document under `users/<your-uid>`, and set its `role` field to `"admin"`. Reload the app; a "Verification queue" row appears on your Profile screen, listing every provider with a pending submission (their submitted photo, name, and city) with Approve/Reject buttons. This flips `providers/<id>.verificationStatus` and pushes a notification to the provider — same `sendPushNotification` path every other status-change endpoint uses.

## Deploying for real

Everything below uses Firebase's free **Spark plan** — no billing account needed, except where noted under "Booking reminders" at the end.

1. **Create the project.** In the [Firebase Console](https://console.firebase.google.com/), create a new project (any name/ID — e.g. `beautybooking-prod`). Under Build, enable:
   - **Authentication** → Sign-in method → Email/Password
   - **Firestore Database** → Create database (any region; `backend/firebase.json`'s `firestore.location` currently says `eur3` — pick a matching region, or update that field to match your choice)
   - **Storage** → Get started (default bucket is fine)
   - Functions doesn't need separate enabling — it activates on first deploy.

2. **Point the Firebase CLI at it, without losing local emulator dev.** From `backend/`, add it as a *named alias* rather than replacing the `default` (demo) one, so `firebase emulators:start` keeps working against `demo-beautybooking` untouched:
   ```bash
   cd backend
   firebase login
   firebase use --add
   # pick your new project, give it an alias e.g. "prod"
   ```
   This appends to `.firebaserc` — `default` stays `demo-beautybooking` for local dev; switch to the real one explicitly with `firebase use prod` when you actually want to deploy, then `firebase use default` to go back to emulator-only work.

3. **Deploy Firestore rules/indexes, Storage rules, and the API function:**
   ```bash
   firebase use prod
   firebase deploy --only firestore,storage,functions:api
   ```
   (Deliberately excludes `functions:sendBookingReminders` — see "Booking reminders" below.)

4. **Point the mobile app at it.** In `mobile/.env`:
   - `EXPO_PUBLIC_USE_EMULATORS=false`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_APP_ID` — all from Project settings → General → Your apps (add a Web app there if you haven't; Expo uses the Firebase JS SDK even on native, so the Web app's config is the right one)
   - `EXPO_PUBLIC_API_BASE_URL` — the Functions URL for `api`, printed after step 3's deploy (looks like `https://us-central1-<project-id>.cloudfunctions.net/api`)

5. **Re-run the seed script against the real project** if you want sample data there too: `GOOGLE_APPLICATION_CREDENTIALS` isn't needed for this — `firebase use prod` plus being logged in via `firebase login` is enough for `backend/scripts/seedEmulator.js`'s Admin SDK calls to reach the real project instead (the script talks to whatever project the CLI is currently pointed at).

**Booking reminders** (the only piece that isn't Spark-plan-free): `backend/functions/src/index.ts` exports a scheduled function, `sendBookingReminders`, that sends 24h/1h-before push reminders. It requires the **Blaze (pay-as-you-go) plan** — Cloud Scheduler and Pub/Sub, which it depends on, aren't available on Spark. Until/unless you upgrade, step 3's `functions:api`-only deploy already skips it safely; deploying it later is just `firebase deploy --only functions:sendBookingReminders` once you're on Blaze. It's fully testable against the emulator without any plan change — see `firebase.json`'s `pubsub` emulator entry and [the backend tests](#running-the-backend-tests) above.

## Real push notifications (EAS)

Expo Go can preview most of the app, but it **cannot** receive real push notifications on Android at all (Google Play policy), and on iOS only in a limited/inconsistent way. `registerForPushNotificationsAsync()` (`mobile/src/services/notifications.ts`) already checks for an EAS project ID and just skips registration with a console warning if one isn't configured — nothing breaks today, this only unlocks real device delivery. Already prepped in the repo:

- `mobile/eas.json` — build profiles (`development`, `preview`, `production`)
- `mobile/app.json` — placeholder `ios.bundleIdentifier` / `android.package` (`com.beautybooking.app`) that EAS builds need; change these before any real App Store/Play Store submission, but they're fine as-is for internal test builds

What's left needs your own Expo account:

1. `npm install -g eas-cli` (or use `npx eas-cli` each time)
2. `cd mobile && eas login`
3. `eas init` — links this project to your Expo account and writes `extra.eas.projectId` into `app.json` automatically
4. `eas build --profile preview --platform android` (or `ios`) — builds an installable app with real push support, distributed as a direct install link (no store submission involved)
5. Install that build on your phone instead of Expo Go, sign in, and push notifications (booking status changes, chat messages, reviews, reminders once deployed) will actually arrive

## Troubleshooting

- **Metro/bundler cache issues**: `npx expo start --clear`
- **"Not signed in" errors calling the API**: make sure the Auth emulator is running and you're actually signed in (check the emulator UI's Authentication tab)
- **Empty provider list**: run the seed script (`node scripts/seedEmulator.js`) against a running emulator
- **`firebase emulators:start` can't find a project**: the repo defaults to a fake local project id (`demo-beautybooking` in `backend/.firebaserc`), which is intentional and requires no real Firebase project
- **Travel buffer between bookings**: `POST /bookings` geocodes `clientAddress` via OpenStreetMap's free Nominatim API (no key/billing needed) and, when it can geocode both the new booking and an existing adjacent one for the same provider, requires a minimum gap between them based on estimated travel time (10–90 min, clamped). This needs outbound internet access even when everything else is running against the local emulators. If Nominatim is unreachable or the address doesn't resolve, geocoding just fails silently and the booking falls back to the plain exact-overlap check — never blocks a booking from being created.
