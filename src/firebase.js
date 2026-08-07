// Firebase app initialization — reads config from Vite env vars so real
// project keys never get committed to the repo. See .env.example for the
// keys this needs; get them from Firebase console > Project settings.
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { isSupported, getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// Offline persistence: cache reads in IndexedDB and queue writes made while
// offline, syncing automatically once the connection comes back — lets
// engineers keep reading/recording equipment data with no signal. Falls
// back to the plain in-memory client if IndexedDB isn't available (some
// private-browsing modes), so a lack of persistence never breaks the app.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  db = getFirestore(app);
}
export { db };
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Opt-in local dev switch to talk to the Firebase Local Emulator Suite
// (`firebase emulators:start`) instead of the real project — set
// VITE_USE_FIREBASE_EMULATOR=true in .env.local. Never active in a build.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

// Analytics isn't available in every environment (e.g. no cookies, some
// embedded webviews) — isSupported() avoids a thrown error in those cases.
export const analyticsReady = isSupported().then((ok) => (ok ? getAnalytics(app) : null));

export default app;
