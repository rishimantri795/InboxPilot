'use client'

import { UserProfile } from './user-profile'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/ui/app-sidebar'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOutIcon } from 'lucide-react'

import { useRouter } from 'next/navigation';

import useCurrentUser from '@/hooks/useCurrentUser';


const getUserInfo = () => {
  // This is a mock function. In a real application, you would fetch this data from your database.
  return [
    "I am a college student studying computer engineering.",
    "I enjoy playing basketball in my free time.",
    "I'm passionate about artificial intelligence and machine learning.",
  ]
}

export default function ProfilePage() {
  const { user, loading, error, clearUser } = useCurrentUser();

  // console.log(user)
  const router = useRouter();
  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3010/api/users/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
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

  const userInfo = getUserInfo()

  if (loading) {
    return <div>Loading...</div>;
  } else if (!user) {
    router.push("/");
    return null; // Prevent rendering below
  } else if (error) {
    return <div>Error: {error}</div>;
  } else {

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarTrigger />

          <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">            

              <h1 className="text-3xl font-bold mb-6">Profile</h1>

            <div className="flex items-center space-x-4 pr-4">
                    <div className="text-right">
                      <p className="font-medium">PLACEHOLDER</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Avatar className="cursor-pointer bg-black text-white">
                          <AvatarImage src="" alt="User avatar" />
                          <AvatarFallback className="bg-black text-white">
                            {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={handleLogout} 
                          className="cursor-pointer"
                        >
                          <LogOutIcon className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
            </div>
            </div>

          <UserProfile initialInfo={userInfo} />

        </div>

      </SidebarProvider>
    )
  }

}

