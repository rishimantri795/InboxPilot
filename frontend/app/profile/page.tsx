"use client";

import { UserProfile } from "./user-profile";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

import UserProfileDropdown from "@/components/UserProfileDropdown";

import { useRouter } from "next/navigation";

import useCurrentUser from "@/hooks/useCurrentUser";
import { useUserContext } from "@/contexts/UserContext";

import axios from "axios";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading, error } = useUserContext();
  const [userInfo, setUserInfo] = useState(null);

  // const userInfo = [];

  useEffect(() => {
    async function getUserInfo() {
      // This is a mock function. In a real application, you would fetch this data from your database.

      // return [
      //   "I am a college student studying computer engineering.",
      //   "I enjoy playing basketball in my free time.",
      //   "I'm passionate about artificial intelligence and machine learning.",
      // ]

      if (!user) {
        return null;
      }

      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/profile`,
          {
            withCredentials: true,
          }
        );

        if (response.data) {
          setUserInfo(response.data);
        } else {
          return null;
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
        return null;
      }
    }

    getUserInfo();
  }, [user]);

  // console.log(user)
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        console.log("Logged out");
        router.push("/");
      } else {
        const errorData = await response.json();
        console.error("Failed to log out", errorData);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // const userInfo = getUserInfo()

  if (loading || userInfo === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  } else if (!user) {
    router.push("/");
    return null; // Prevent rendering below
  } else if (error) {
    return <div>Error: {error}</div>;
  } else {
    console.log("user info: ", userInfo);

    return (
      <SidebarProvider>
        <AppSidebar currentTab="User Profile" />
        <SidebarTrigger />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold mb-6">Profile</h1>
            <div className="flex items-center space-x-4 pr-4">
              <div className="text-right">
              </div>
              <div className="flex items-center space-x-4" id="tour-finish">
                <UserProfileDropdown name={user.name || "John Doe"} email={user.email} />
              </div>
            </div>
          </div>

          <UserProfile initialInfo={userInfo} user={user.id} />
        </div>
      </SidebarProvider>
    );
  }
}
