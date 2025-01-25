import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.VITE_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.VITE_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Ensure Firebase is only initialized once
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Auth and Google Auth Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// googleProvider.addScope('https://www.googleapis.com/auth/calendar');
// googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");

googleProvider.setCustomParameters({
  access_type: "offline", // This requests a refresh token
  prompt: "consent", // Forces consent screen to ensure refresh token
});

export { auth, googleProvider };
