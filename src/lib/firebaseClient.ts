// lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_GOOGLE_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const analyticsPromise =
  typeof window !== "undefined"
    ? analyticsSupported().then((ok) => (ok ? getAnalytics(app) : null))
    : Promise.resolve(null);

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);

export { app, auth, db, googleProvider, analyticsPromise, storage };
