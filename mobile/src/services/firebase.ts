import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const useEmulators = process.env.EXPO_PUBLIC_USE_EMULATORS === "true";

const firebaseConfig = useEmulators
  ? {
      apiKey: "demo",
      authDomain: "demo",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "demo-beautybooking",
    }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

if (useEmulators) {
  const authHost = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });

  const storageHost = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199";
  const [storageHostname, storagePort] = storageHost.split(":");
  connectStorageEmulator(storage, storageHostname, Number(storagePort));

  const firestoreHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const [firestoreHostname, firestorePort] = firestoreHost.split(":");
  connectFirestoreEmulator(db, firestoreHostname, Number(firestorePort));
}
