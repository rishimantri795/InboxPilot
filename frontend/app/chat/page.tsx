"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LogOutIcon, MailXIcon } from "lucide-react"
import useCurrentUser from "@/hooks/useCurrentUser"
import { useRouter } from "next/navigation"

// Assume we have a custom hook for our chatbot
import { useChatBot } from "@/hooks/useChatBot"

export default function ChatBotPage() {
  const [ragEnabled, setRagEnabled] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(true)
  const [input, setInput] = useState("")
  const { user, loading, error } = useCurrentUser()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Use our custom chatbot hook
  const { messages, sendMessage} = useChatBot(ragEnabled)
  
  useEffect(() => {
    const ragPermission = localStorage.getItem("ragPermission")
    if (ragPermission) {
      setShowPermissionDialog(false)
      setRagEnabled(ragPermission === "true")
    }
  }, [])

  useEffect(() => {
    // const messagesEndRef = useRef<HTMLDivElement | null>(null);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages]) //Corrected dependency

  const handlePermissionResponse = (allow: boolean) => {
    setRagEnabled(allow)
    localStorage.setItem("ragPermission", allow.toString())
    setShowPermissionDialog(false)
  }

  const toggleRag = () => {
    setRagEnabled(!ragEnabled)
    localStorage.setItem("ragPermission", (!ragEnabled).toString())
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input)
      setInput("")
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        console.log("Logged out")
        router.push("/")
      } else {
        const errorData = await response.json()
        console.error("Failed to log out", errorData)
      }
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    )
  } else if (!user) {
    router.push("/")
    return null
  } else if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <SidebarProvider>
      <AppSidebar currentTab="ChatBot" />
      <SidebarTrigger />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold mb-6">ChatBot</h1>
          <div className="flex items-center space-x-4">
          <Button
          onClick={toggleRag}
          className={`mb-2 shadow-lg transition-colors ${
            ragEnabled ? "bg-black text-white" : "bg-red-600 text-white"
          }`}
           >
          <MailXIcon className="mr-2 h-4 w-4" />
          {ragEnabled ? "RAG Enabled" : "RAG Disabled"}
        </Button>

            {/* <Switch checked={ragEnabled} onCheckedChange={toggleRag} aria-label="Toggle RAG" /> */}
            {/* <span>{ragEnabled ? "RAG Enabled" : "RAG Disabled"}</span> */}
            <div className="flex items-center space-x-4 pr-4">
              <div className="text-right">
                <p className="font-medium">{user.name || "John Doe"}</p>
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
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Card className="w-full max-w-6xl mx-auto">
          <CardHeader>
            {/* <CardTitle>AI Chat</CardTitle> */}
          </CardHeader>
          <CardContent className="h-[60vh] overflow-y-auto">
            {messages.map((m, index) => (
              <div key={index} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                <span
                  className={`inline-block p-2 rounded-lg ${m.role === "user" ? "bg-gray-500 text-white" : "bg-gray-200 text-black"}`}
                >
                  {m.content}
                </span>
              </div>
            ))}
            {/* {(
              <div className="text-left">
                <span className="inline-block p-2 rounded-lg bg-gray-200 text-black">AI is typing...</span>
              </div>
            )} */}
            <div ref={messagesEndRef} />
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow"
              />
              <Button type="submit">
                Send
              </Button>
            </form>
          </CardFooter>
        </Card>

        <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable RAG?</DialogTitle>
              <DialogDescription>
                Do you want to allow Retrieval-Augmented Generation (RAG) for enhanced responses?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handlePermissionResponse(false)}>No</Button>
              <Button onClick={() => handlePermissionResponse(true)}>Yes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  )
}

