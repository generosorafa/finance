import { initializeApp } from 'firebase/app';
import {
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  initializeAppCheck,
} from 'firebase/app-check';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
const appCheckProvider = import.meta.env.VITE_FIREBASE_APPCHECK_PROVIDER || 'recaptcha-enterprise';

if (app && appCheckSiteKey) {
  const provider = appCheckProvider === 'recaptcha-v3'
    ? new ReCaptchaV3Provider(appCheckSiteKey)
    : new ReCaptchaEnterpriseProvider(appCheckSiteKey);

  initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

export function subscribeToAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase nao configurado.');
  return signInWithPopup(auth, googleProvider);
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

export function userCollection(userId, name) {
  return collection(db, 'users', userId, name);
}

export function userDocument(userId, name, id) {
  return doc(db, 'users', userId, name, id);
}

export async function loadCollection(userId, name) {
  const snapshot = await getDocs(userCollection(userId, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveUserDocument(userId, name, id, data) {
  await setDoc(userDocument(userId, name, id), data, { merge: true });
}

export async function removeUserDocument(userId, name, id) {
  await deleteDoc(userDocument(userId, name, id));
}

export async function loadSettings(userId) {
  const ref = doc(db, 'users', userId, 'config', 'settings');
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : {};
}

export async function saveSettings(userId, settings) {
  const ref = doc(db, 'users', userId, 'config', 'settings');
  await setDoc(ref, settings, { merge: true });
}

export async function replaceSettings(userId, settings) {
  const ref = doc(db, 'users', userId, 'config', 'settings');
  await setDoc(ref, settings);
}
