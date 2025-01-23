import { Workflow, User, Home, Inbox, Search, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider, 
  SidebarTrigger
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
 
  // {
  //   title: "Settings",
  //   url: "#",
  //   icon: Settings,
  // },
]

export function AppSidebar({currentTab}: {currentTab: string}) {
  return (
    <Sidebar className="bg-sidebar-white">
      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Inbox Pilot</SidebarGroupLabel> */}
          <SidebarGroupContent>
          <div className="flex items-center px-4 py-3">
              <Inbox className="h-6 w-6" />
              <span className="ml-2 text-2xl font-bold transition-opacity duration-300 color-black">
                InboxPilot
              </span>
            </div>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title} active={currentTab === item.title}>
                  <SidebarMenuButton asChild className="flex items-center gap-4 px-4 py-3">
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

