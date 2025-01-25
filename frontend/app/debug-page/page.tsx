"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import axios from "axios"; // Import axios
axios.defaults.withCredentials = true;

// api endpoints for dropdown menu
const apiOptions = [
  {
    label: "Verify Token",
    endpoint: `${process.env.VITE_BACKEND_URL}/api/users/verifyToken`,
  },
  {
    label: "Fake API",
    endpoint: `${process.env.VITE_BACKEND_URL}/api/users/fakeAPI`,
  },
];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [selectedApi, setSelectedApi] = useState(apiOptions[0].endpoint);

  const [user, setUser] = useState<{
    id: string;
    email: string;
    refreshToken?: string;
    createdAt?: any;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        interface User {
          id: string;
          email: string;
          refreshToken: string;
          createdAt: string;
        }

        interface ResponseData {
          user?: User;
        }

        const response: { data: ResponseData } = await axios.get(
          `${process.env.VITE_BACKEND_URL}/api/users/current-user`
        );
        if (response.data.user) {
          const mappedUser = {
            id: response.data.user.id,
            email: response.data.user.email,
            refreshToken: response.data.user.refreshToken,
            createdAt: response.data.user.createdAt,
          };
          setUser(mappedUser || null);
          console.log(response.data.user);
          console.log("Authenticated user:", mappedUser);
        } else {
          setUser(null);
          console.log("No authenticated user.");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const passPortAuth = async () => {
    try {
      // Redirect to the Passport.js authentication route
      window.location.href = `${process.env.VITE_BACKEND_URL}/api/users/google/auth`; // Change this URL based on your server configuration
    } catch (e) {
      console.error("Error during Passport authentication:", e);
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

  const signOutPassport = async () => {
    try {
      const response = await axios.post(
        `${process.env.VITE_BACKEND_URL}/api/users/logout`
      );
      if (response.status === 200) {
        console.log("Logged out successfully");
      } else {
        console.error("Failed to log out", response.data);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20">
      <div className="mt-4">
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <p>Signed in as: {user.email}</p>
        ) : (
          <p>Not signed in.</p>
        )}
      </div>

      <div className="mt-4">
        <button onClick={passPortAuth}>Sign In with Google (Passport)</button>
      </div>
      <div className="mt-4">
        <button onClick={signOutPassport}>Sign Out (Passport)</button>
      </div>
      <div className="mt-4">
        <Link href="/rules">
          <button>Go to add rules page</button>
        </Link>
      </div>
      <div className="mt-4">
        <Link href="/">
          <button>Go to landing page</button>
        </Link>
      </div>
      <div className="mt-4">
        <label htmlFor="apiDropdown" className="block mb-2">
          Select API Call:
        </label>
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
        <label htmlFor="apiInput" className="block mb-2">
          Text Input:
        </label>
        <input
          type="text"
          id="apiInput"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="text-black bg-white border border-gray-300 p-2 text-base"
        />
        <button onClick={handleApiCall}>
          Send Text to API (Prints text and api into console)
        </button>
      </div>
    </div>
  );
}
