"use client"; // Add this line at the top of your component

import { auth, googleProvider } from "./config/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

export default function Home() {
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
    }
  };

  const signOutWithGoogle = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20">
      <button onClick={signInWithGoogle}>Google Sign In</button>
      <button onClick={signOutWithGoogle}>Sign Out</button>
    </div>
  );
}
