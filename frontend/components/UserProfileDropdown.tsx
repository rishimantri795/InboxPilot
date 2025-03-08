"use client";

import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { LogOutIcon, MailXIcon, TramFront, Sun, Moon} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";

interface Tour {
  start: () => void;
}

interface UserProfileDropdownProps {
  name: string;
  email: string;
  tour?: Tour;
  avatarUrl?: string;
}

export default function UserProfileDropdown({
  name,
  email,
  tour,
  // avatarUrl,
}: UserProfileDropdownProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }

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

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const activateProduction = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/attach-prod-listener`, {}, { withCredentials: true });
      if (response.status === 200) {
        console.log("Gmail listener detached successfully");
        toast.success("Gmail listener detached successfully");
      } else {
        console.error("Failed to detach Gmail listener", response.data);
        toast.error("Failed to detach Gmail listener");
      }
    } catch (error) {
      console.error("Error detaching Gmail listener:", error);
      toast.error("Error detaching Gmail listener");
    }
  };

  const activateDev = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/attach-dev-listener`, {}, { withCredentials: true });
      if (response.status === 200) {
        console.log("Gmail listener detached successfully");
        toast.success("Gmail listener detached successfully");
      } else {
        console.error("Failed to detach Gmail listener", response.data);
        toast.error("Failed to detach Gmail listener");
      }
    } catch (error) {
      console.error("Error detaching Gmail listener:", error);
      toast.error("Error detaching Gmail listener");
    }
  };
  return (
    <>
      <div className="text-right">
        <p className="font-medium">{name ? name : "John Doe"}</p>
        <p className="text-sm text-gray-500">{email}</p>
      </div>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer bg-black text-white">
          <AvatarImage src="" alt="User avatar" />
          <AvatarFallback className="bg-black text-white">{email ? email.charAt(0).toUpperCase() : "U"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
        {process.env.NEXT_PUBLIC_BACKEND_URL === "http://localhost:3010" && (
          <div>
            <DropdownMenuItem onClick={activateProduction} className="cursor-pointer">
              <MailXIcon className="mr-2 h-4 w-4" />
              <span>Activate Production P/S</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={activateDev} className="cursor-pointer">
              <MailXIcon className="mr-2 h-4 w-4" />
              <span>Activate Dev P/S</span>
            </DropdownMenuItem>
          </div>
        )}
        {tour && (
          <DropdownMenuItem onClick={() => tour.start()} className="cursor-pointer">
            <TramFront className="mr-2 h-4 w-4" />
            <span>Start Tour</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleToggleTheme} className="cursor-pointer">
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>Switch to Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>Switch to Dark Mode</span>
              </>
            )}
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </>
  );
}
