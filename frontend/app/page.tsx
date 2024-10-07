"use client";

import { auth, googleProvider } from "../config/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import axios from "axios"; // Import axios

export default function Home() {
  const signInWithGoogle = async () => {
    try {
      // Sign in with Google and get the result
      const result = await signInWithPopup(auth, googleProvider);

      // Get the ID token from the authenticated user
      const idToken = await result.user.getIdToken();
      console.log("ID Token:", idToken);

      // Send the ID token to the backend for verification using axios
      const response = await axios.post(
        "http://localhost:3010/api/users/verifyToken",
        {
          idToken: idToken, // Send ID token as part of request body
        }
      );

      if (response.status === 200) {
        console.log("Token verified successfully!");
        console.log(response.data);
      } else {
        console.error("Failed to verify token.", response.data);
      }
    } catch (e) {
      console.error("Error signing in with Google:", e);
    }
  };

  const signOutWithGoogle = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
    } catch (e) {
      console.error("Error signing out:", e);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20">
      <button onClick={signInWithGoogle}>Google Sign In</button>
      <button onClick={signOutWithGoogle}>Sign Out</button>
    </div>
  );
}
