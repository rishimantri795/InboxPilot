import {
  Workflow,
  User,
  LogOut,
  MailXIcon,
  BotMessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import logo from "@/images/Inbox Pilot Logo.png";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useTheme } from "next-themes";

// Menu items.
const items = [
  {
    title: "Rules",
    url: "/rules",
    icon: Workflow,
  },
  {
    title: "User Profile",
    url: "/profile",
    icon: User,
  },
  {
    title: "Recall+", // New tab
    url: "/chat",
    icon: BotMessageSquare, // Use a valid icon
  },
];

export function AppSidebar({ currentTab }) {
  const { user, loading, error } = useCurrentUser();
  const [listenerStatus, setListenerStatus] = useState<number | null>(null);
  const { theme } = useTheme();
  useEffect(() => {
    if (user) {
      fetchListenerStatus();
    }
  }, [user]);

  const fetchListenerStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/listener-status`
      );
      setListenerStatus(response.data.status); // Should be 0 or 1
    } catch (error) {
      console.error("Failed to fetch listener status:", error);
    }
  };

  const toggleListener = async () => {
    try {
      const newStatus = listenerStatus === 1 ? 0 : 1;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/toggle-listener`,
        { status: newStatus }
      );

      if (response.status === 200) {
        setListenerStatus(newStatus);
        toast.success(
          `Listener ${newStatus === 1 ? "Attached" : "Detached"} Successfully`
        );
      } else {
        toast.error("Failed to update listener status.");
      }
    } catch (error) {
      console.error("Error toggling listener:", error);
      toast.error("Error toggling listener");
    }
  };

  const handleClick = () => {
    window.location.href = "/";
  };

  if (loading) return null;
  if (error) return <p className="text-red-500">Error loading user.</p>;

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center px-4 py-3">
              <Image
                src={logo || "/placeholder.svg"}
                width={24}
                height={24}
                alt="InboxPilot"
              />
              <span
                className="ml-2 text-2xl font-bold transition-opacity duration-300 color-black cursor-pointer"
                onClick={handleClick}
              >
                InboxPilot
              </span>
            </div>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  active={currentTab === item.title}
                >
                  
                  <SidebarMenuButton
                    asChild
                    className={`flex items-center gap-4 px-4 py-3 ${
                      theme === "dark" ? "text-white" : "text-black"
                    } ${
                      currentTab === item.title ? theme === "dark" ? "bg-gray-700" : "bg-gray-300"
                     : ""
                    }`} 
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user && <SidebarMenuItem></SidebarMenuItem>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
