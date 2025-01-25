import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
