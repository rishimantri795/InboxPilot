"use client";

import { useState } from "react";
import { auth, googleProvider } from "../config/firebase";
import { signInWithPopup, signOut, GoogleAuthProvider, UserCredential } from "firebase/auth";

import axios from "axios"; // Import axios

// api endpoints for dropdown menu
const apiOptions = [
  { label: "Verify Token", endpoint: "http://localhost:3010/api/users/verifyToken" },
  { label: "Fake API", endpoint: "http://localhost:3010/api/users/fakeAPI" },
];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [selectedApi, setSelectedApi] = useState(apiOptions[0].endpoint);
  const signInWithGoogle = async () => {
    try {
      // Sign in with Google and get the result
      // const result = await signInWithPopup(auth, googleProvider);
      const result = await signInWithPopup(auth, googleProvider) as UserCredential & {
        _tokenResponse?: {
          refreshToken: string;
        };
      };

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential === null) {
        throw new Error("No credential returned from Google.");
      }
      // const accessToken = credential.accessToken;
      const refreshToken = result._tokenResponse?.refreshToken;
      if (!refreshToken) {
        console.warn('No refresh token received. User might have already granted permissions.');
        return;
      }

      console.log("Access Token:", refreshToken);

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

  const handleApiCall = async () => {
    try {
      console.log("Selected API:", selectedApi);
      console.log("Input Text:", inputText);

      const response = await axios.post(selectedApi, {
        inputText: inputText,
      });

      if (response.status === 200) {
        console.log("API call successful:", response.data);
      } else {
        console.error("Failed API call:", response.data);
      }
    } catch (e) {
      console.error("Error making API call:", e);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20">
      <div className="mt-4">
        <button onClick={signInWithGoogle}>Google Sign In</button>
      </div>
      <div className="mt-4">
        <button onClick={signOutWithGoogle}>Google Sign Out</button>
      </div>
      <div className="mt-4">
        <label htmlFor="apiDropdown" className="block mb-2">Select API Call:</label>
        <select 
          id="apiDropdown"
          value={selectedApi}
          onChange={(e) => setSelectedApi(e.target.value)}
          className="text-black bg-white border border-gray-300 p-2 text-base"
        >
          {apiOptions.map((option, index) => (
            <option key={index} value={option.endpoint}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <label htmlFor="apiInput" className="block mb-2">Text Input:</label>
        <input
          type="text"
          id="apiInput"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="text-black bg-white border border-gray-300 p-2 text-base"
        />
        <button onClick={handleApiCall}>Send Text to API (Prints text and api into console)</button>
      </div>
    </div>
  );
}
