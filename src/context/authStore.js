// Auth backed by Firebase Authentication (credentials) + Firestore (profile:
// name/role/factories — Firebase Auth itself has no concept of these).
// Session mirrors into sessionStorage under the same key/shape as before so
// every existing call site that does a synchronous getSession() keeps working
// unchanged. Firebase Auth persistence is set to session-scope to match.
import {
  signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase.js';

const SESSION_KEY = 'authUser';
const USERS_COLLECTION = 'users';

let persistenceReady = null;
function ensurePersistence() {
  if (!persistenceReady) persistenceReady = setPersistence(auth, browserSessionPersistence);
  return persistenceReady;
}

async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

export async function login(email, password) {
  try {
    await ensurePersistence();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(cred.user.uid);
    if (!profile) {
      // Authenticated with Firebase but no matching profile doc — treat as
      // no access (covers accounts whose profile was removed via Settings).
      await signOut(auth);
      return null;
    }
    const session = {
      id: profile.id, name: profile.name, role: profile.role, factories: profile.factories || [],
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  signOut(auth).catch(() => { /* best-effort — session storage is already cleared */ });
}

export function getSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch { /* ignore corrupt data */ }
  return { id: null, name: 'Admin', role: 'admin', factories: [] };
}

// ---- Admin user directory (Settings page) ----
// Firestore is the queryable "directory" (name/email/role/factories); actual
// sign-in credentials live in Firebase Auth and aren't listable from the
// client without the Admin SDK, so this only reflects users who have a
// profile doc (i.e. were created through this app).
export async function fetchAllUsers() {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveUserProfile(uid, profile) {
  await setDoc(doc(db, USERS_COLLECTION, uid), profile, { merge: true });
}

// The three admin-privileged operations below run on Cloud Functions (Admin
// SDK) instead of the client SDK, since creating/editing/deleting *other*
// users' Firebase Auth credentials isn't possible from the client. Each
// function re-checks the caller is an admin server-side before doing anything.
const createUserAccountFn = httpsCallable(functions, 'createUserAccount');
const updateUserAccountFn = httpsCallable(functions, 'updateUserAccount');
const deleteUserAccountFn = httpsCallable(functions, 'deleteUserAccount');

export async function createUserAccount({
  email, password, name, role, factories,
}) {
  const res = await createUserAccountFn({
    email, password, name, role, factories,
  });
  return res.data.uid;
}

export async function updateUserAccount({
  uid, email, password, name, role, factories,
}) {
  await updateUserAccountFn({
    uid, email, password, name, role, factories,
  });
}

export async function deleteUserAccount(uid) {
  await deleteUserAccountFn({ uid });
}
