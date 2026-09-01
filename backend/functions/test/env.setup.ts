// Runs before any test module is imported, so src/index.ts's admin.initializeApp() connects
// to the local emulators instead of trying to reach real Firebase infrastructure.
process.env.GCLOUD_PROJECT = "demo-beautybooking";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
