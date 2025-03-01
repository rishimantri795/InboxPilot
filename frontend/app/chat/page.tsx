"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOutIcon,
  MailXIcon,
  CheckCircle,
  AlertCircle,
  Send,
  Mail,
  Settings,
  Info,
  Database,
  Trash2,
  RefreshCw,
} from "lucide-react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { useChatBot } from "@/hooks/useChatBot";

// Helper function to format time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ChatBotPage() {
  const [ragEnabled, setRagEnabled] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [input, setInput] = useState("");
  const { user, loading, error } = useCurrentUser();
  const router = useRouter();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Progress state
  const [onboardingStatus, setOnboardingStatus] = useState({
    phase: "waiting", // waiting, fetching, saving, deleting, complete, error
    fetch: 0, // Fetch progress (0-50)
    save: 0, // Save progress (0-50)
    total: 0, // Total progress (0-100)
  });

  // Track if we're currently enabling or disabling RAG
  const [isEnablingRag, setIsEnablingRag] = useState(true);

  // Use our custom chatbot hook
  const { messages, sendMessage, isTyping } = useChatBot(ragEnabled);

  // Fetch onboarding progress
  const fetchOnboardingProgress = useCallback(async () => {
    console.log("Fetching progress...");
    try {
      const response = await fetch(
        `http://localhost:3023/progress?userId=${user?.id}`
      );
      const data = await response.json();
      setOnboardingStatus(data);
      console.log("Onboarding progress:", data);

      if (data.phase === "complete") {
        console.log("Onboarding complete!");
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
      setOnboardingStatus({
        phase: "error",
        fetch: 0,
        save: 0,
        total: -1,
      });
    }
  }, [user?.id]);

  // Handle RAG permission based on user state
  useEffect(() => {
    if (user?.RAG === "enabled" || user?.RAG === undefined) {
      setRagEnabled(true);
    } else if (user?.RAG === "disabled") {
      setRagEnabled(false);
      setShowPermissionDialog(true);
    }

    if (user?.id) {
      fetchOnboardingProgress();
    }
  }, [user, fetchOnboardingProgress]);

  // Poll progress when onboarding or disabling is in progress
  useEffect(() => {
    let interval;
    const shouldPoll =
      onboardingStatus.phase !== "complete" &&
      onboardingStatus.phase !== "error" &&
      onboardingStatus.phase !== "waiting" &&
      user?.id;
    const isInProgress =
      onboardingStatus.total > 0 && onboardingStatus.total < 100;

    if (shouldPoll || isInProgress) {
      console.log("Starting progress polling...");
      interval = setInterval(fetchOnboardingProgress, 2000);
    }

    return () => {
      if (interval) {
        console.log("Clearing progress polling interval");
        clearInterval(interval);
      }
    };
  }, [
    onboardingStatus.phase,
    onboardingStatus.total,
    fetchOnboardingProgress,
    user?.id,
  ]);

  // Scroll to the bottom of the chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input field when chat is loaded
  useEffect(() => {
    if (!loading && user && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, user]);

  // Handle RAG permission response
  const handlePermissionResponse = (allow) => {
    setRagEnabled(allow);
    localStorage.setItem("ragPermission", allow.toString());
    setShowPermissionDialog(false);
  };

  // Toggle RAG functionality
  const toggleRag = async () => {
    if (!user) return;

    const newRagState = !ragEnabled;
    setRagEnabled(newRagState);
    setIsEnablingRag(newRagState);

    setOnboardingStatus({
      phase: "waiting",
      fetch: 0,
      save: 0,
      total: 0,
    });

    try {
      if (newRagState) {
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboardingRAG/disableRAG`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              refreshToken: user.refreshToken,
            }),
          }
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const endpoint = newRagState
        ? "/api/onboardingRAG/enableRAG"
        : "/api/onboardingRAG/disableRAG";

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          refreshToken: user.refreshToken,
        }),
      });

      fetchOnboardingProgress();
    } catch (error) {
      console.error("Failed to toggle RAG:", error);
      setOnboardingStatus({
        phase: "error",
        fetch: 0,
        save: 0,
        total: -1,
      });
    }

    localStorage.setItem("ragPermission", newRagState.toString());
  };

  // Handle message submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/logout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        router.push("/");
      } else {
        const errorData = await response.json();
        console.error("Failed to log out:", errorData);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Get progress status message based on current phase
  const getProgressStatusMessage = () => {
    switch (onboardingStatus.phase) {
      case "fetching":
        return "Fetching emails...";
      case "saving":
        return "Saving to database...";
      case "deleting":
        return "Deleting emails...";
      case "initializing":
        return isEnablingRag
          ? "Initializing RAG..."
          : "Preparing to disable RAG...";
      default:
        return "Processing...";
    }
  };

  // Get progress icon based on current phase
  const getProgressIcon = () => {
    switch (onboardingStatus.phase) {
      case "fetching":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "saving":
        return <Database className="h-4 w-4 text-blue-600" />;
      case "deleting":
        return <Trash2 className="h-4 w-4 text-blue-600" />;
      case "initializing":
        return <Settings className="h-4 w-4 text-blue-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  // Get completion message based on operation
  const getCompletionMessage = () => {
    if (isEnablingRag) {
      return "RAG setup complete! Enhanced responses are now enabled.";
    } else {
      return "RAG has been disabled. Your emails have been removed from the database.";
    }
  };

  // Determine if we're in an active processing state
  const isProcessing =
    onboardingStatus.phase !== "complete" &&
    onboardingStatus.phase !== "error" &&
    onboardingStatus.phase !== "waiting";

  // Redirect if no user is found
  if (!loading && !user) {
    router.push("/");
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center p-8 max-w-md bg-white rounded-xl shadow-xl border border-gray-100">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
            onClick={() => router.push("/")}
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-md w-full mx-4 transform animate-scaleIn">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-black border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Loading your workspace
            </h3>
            <p className="text-gray-500 text-center">
              Preparing your personalized email assistant...
            </p>
          </div>
        </div>
      )}

      <AppSidebar currentTab="Recall+" />
      <SidebarTrigger />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div className="flex items-center">
            <div className="bg-black rounded-lg p-2 mr-3">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Recall+
            </h1>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* RAG Status and Controls */}
            <div className="flex flex-col items-start">
              <Button
                onClick={toggleRag}
                className={`shadow-lg transition-all duration-300 px-4 py-2 rounded-lg ${
                  ragEnabled
                    ? "bg-black hover:bg-gray-800 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  ragEnabled ? "focus:ring-black" : "focus:ring-red-500"
                }`}
                disabled={isProcessing}
              >
                <MailXIcon className="mr-2 h-4 w-4" />
                {ragEnabled ? "RAG Enabled" : "RAG Disabled"}
              </Button>

              {/* Processing Status */}
              {isProcessing && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center w-full max-w-xs animate-fadeIn shadow-sm">
                  <div className="mr-3 bg-blue-100 rounded-full p-2">
                    {getProgressIcon()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700 mb-1 flex items-center">
                      {getProgressStatusMessage()}
                      <span className="ml-auto text-xs text-blue-500">
                        {onboardingStatus.total}%
                      </span>
                    </p>
                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${onboardingStatus.total}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Completion Status */}
              {onboardingStatus.phase === "complete" && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center w-full max-w-xs animate-fadeIn shadow-sm">
                  <div className="mr-3 bg-green-100 rounded-full p-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-green-700">
                    {getCompletionMessage()}
                  </p>
                </div>
              )}

              {/* Error Status */}
              {onboardingStatus.phase === "error" && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center w-full max-w-xs animate-fadeIn shadow-sm">
                  <div className="mr-3 bg-red-100 rounded-full p-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      An error occurred
                    </p>
                    <p className="text-xs text-red-500">
                      Please try again later
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3 ml-auto bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <div className="text-right">
                <p className="font-medium">{user?.name || "John Doe"}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer bg-black text-white hover:opacity-90 transition-opacity border-2 border-white shadow-md">
                    <AvatarImage src="" alt="User avatar" />
                    <AvatarFallback className="bg-black text-white">
                      {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-2 rounded-lg shadow-lg border border-gray-100"
                >
                  <div className="px-2 py-1.5 mb-1 border-b border-gray-100">
                    <p className="text-sm font-medium">Signed in as</p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer rounded-md mt-1 focus:bg-red-50 focus:text-red-600"
                  >
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Card className="w-full max-w-6xl mx-auto shadow-lg border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 py-4">
            <div className="flex items-center">
              <div className="bg-black rounded-full p-1.5 mr-2">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg font-medium">
                Chat with Recall+
              </CardTitle>
              {ragEnabled ? (
                <span className="ml-auto bg-black text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <Database className="h-3 w-3 mr-1" />
                  RAG Active
                </span>
              ) : (
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Basic Mode
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[60vh] overflow-y-auto p-6 bg-gradient-to-b from-white to-gray-50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="bg-gray-100 rounded-full p-6 mb-6">
                  <Mail className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-gray-800">
                  Welcome to Recall+
                </h3>
                <p className="max-w-md text-gray-500 mb-6">
                  Ask me anything about your emails. I can help you find
                  information, summarize content, and more.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    "Find emails from last week",
                    "Summarize emails from John",
                    "What's my next meeting?",
                    "Show unread messages",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm text-left transition-colors"
                      onClick={() => {
                        setInput(suggestion);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m, index) => {
                  const isUser = m.role === "user";
                  const isLast = index === messages.length - 1;

                  return (
                    <div
                      key={index}
                      className={`flex ${
                        isUser ? "justify-end" : "justify-start"
                      } ${isLast ? "animate-fadeIn" : ""}`}
                    >
                      {!isUser && (
                        <div className="mr-2 flex-shrink-0">
                          <div className="bg-black rounded-full p-1.5 w-8 h-8 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex flex-col ${
                          isUser ? "items-end" : "items-start"
                        } max-w-[80%]`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            isUser
                              ? "bg-black text-white rounded-tr-none"
                              : "bg-gray-100 text-gray-800 rounded-tl-none"
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-xs text-gray-400 mt-1 px-2">
                          {formatTime(new Date())}
                        </span>
                      </div>
                      {isUser && (
                        <div className="ml-2 flex-shrink-0">
                          <Avatar className="w-8 h-8 bg-gray-200">
                            <AvatarFallback className="text-xs">
                              {user?.email
                                ? user.email.charAt(0).toUpperCase()
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className="mr-2 flex-shrink-0">
                      <div className="bg-black rounded-full p-1.5 w-8 h-8 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex space-x-2">
                        <div
                          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <CardFooter className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={handleSubmit} className="flex w-full space-x-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow border-gray-300 focus:border-black focus:ring-black rounded-lg py-3 px-4 shadow-sm"
              />
              <Button
                type="submit"
                disabled={isTyping || !input.trim()}
                className={`bg-black hover:bg-gray-800 text-white rounded-lg px-4 transition-all duration-200 ${
                  input.trim() ? "opacity-100" : "opacity-70"
                } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2`}
              >
                <Send className="h-4 w-4" />
                <span className="ml-2">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>

        <Dialog
          open={showPermissionDialog}
          onOpenChange={setShowPermissionDialog}
        >
          <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden">
            <div className="bg-black text-white p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-3">
                  <Mail className="h-6 w-6 text-black" />
                </div>
              </div>
              <DialogTitle className="text-xl text-center">
                Enable Email Intelligence
              </DialogTitle>
            </div>
            <div className="p-6">
              <DialogDescription className="text-gray-600 mb-4">
                Do you want to allow Retrieval-Augmented Generation (RAG) for
                enhanced responses based on your email data?
              </DialogDescription>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  How RAG Works
                </h4>
                <p className="text-sm text-blue-700">
                  Enabling RAG will allow the AI to access and analyze your
                  emails to provide more personalized and accurate responses.
                  Your data is processed securely and is not shared with third
                  parties.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-full p-1 mr-3 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Personalized Responses</p>
                    <p className="text-gray-500">
                      Get answers based on your actual email content
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-full p-1 mr-3 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Secure Processing</p>
                    <p className="text-gray-500">
                      Your data is encrypted and never shared
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push("/rules");
                  }}
                  className="w-full sm:w-auto border-gray-300 hover:bg-gray-100"
                >
                  No, Thanks
                </Button>
                <Button
                  onClick={() => toggleRag()}
                  className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white"
                >
                  Yes, Enable RAG
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
    </SidebarProvider>
  );
}
