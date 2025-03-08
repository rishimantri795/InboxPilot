"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import useCurrentUser from "@/hooks/useCurrentUser";

export default function SettingsPage() {
  const { user, loading, error, clearUser } = useCurrentUser();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <SidebarProvider>
      <AppSidebar currentTab="Settings" />
      <SidebarTrigger />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <span className="text-lg">Dark Mode</span>
          <ThemeToggle />
        </div>
      </div>
    </SidebarProvider>
  );
}
