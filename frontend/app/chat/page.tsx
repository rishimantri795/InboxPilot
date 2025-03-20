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
  BrainCircuit,
  CheckCircle,
  AlertCircle,
  Send,
  Mail,
  Settings,
  Info,
  Database,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Calendar,
  User,
  Paperclip,
  X,
  Search,
  BotMessageSquare,
} from "lucide-react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { useChatBot } from "@/hooks/useChatBot";
import ReactMarkdown from "react-markdown"; // Import react-markdown
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// First, let's fix the TypeScript errors
interface HTMLElementWithScrollIntoView extends HTMLElement {
  scrollIntoView(options?: ScrollIntoViewOptions): void;
}

// Let's update the interface to handle both HTMLElement and HTMLDivElement
interface HTMLDivElementWithScrollIntoView extends HTMLDivElement {
  scrollIntoView(options?: ScrollIntoViewOptions): void;
}

interface HTMLInputElementWithFocus extends HTMLInputElement {
  focus(): void;
}

// Interface for email metadata
interface EmailMetadata {
  id: string;
  subject?: string;
  sender?: string;
  date?: string;
  snippet?: string;
  hasAttachments?: boolean;
  labels?: string[];
  threadId?: string;
  receivedTime?: Date;
}

// Helper function to format time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Helper function to get time difference
const getTimeDifference = (date: Date | string): string => {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date provided to getTimeDifference");
  }

  const now = new Date();
  const diff = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return formatTime(parsedDate);
};

// Helper function to open Gmail with a specific email
const openGmailWithEmail = (threadId: string | undefined) => {
  if (!threadId) {
    console.error("Cannot open email: threadId is undefined");
    return;
  }
  window.open(`https://mail.google.com/mail/u/0/#all/${threadId}`, "_blank");
};

// Function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// Function to fetch email details from Gmail
const fetchEmailDetails = async (
  emailIds: string[],
  refreshToken: string
): Promise<Record<string, EmailMetadata>> => {
  try {
    console.log(`Fetching details for ${emailIds.length} emails:`, emailIds);

    // Make API call to backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/emails/details`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailIds,
          refreshToken,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error (${response.status}):`, errorData);
      throw new Error(`Failed to fetch email details: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Email details received:", Object.keys(data.emails).length);

    if (Object.keys(data.emails).length === 0) {
      console.warn("No email details were returned from the API");
    }

    return data.emails;
  } catch (error) {
    console.error("Error in fetchEmailDetails:", error);

    // Return fallback data for all emails
    return emailIds.reduce((acc, id) => {
      acc[id] = createFallbackEmailMetadata(id);
      return acc;
    }, {} as Record<string, EmailMetadata>);
  }
};

// Function to create fallback email metadata
const createFallbackEmailMetadata = (id: string): EmailMetadata => {
  console.log(`Creating fallback metadata for email: ${id}`);
  return {
    id: id,
    subject: "Email Not Found",
    sender: "Unknown",
    snippet: "Unable to retrieve email details at this time.",
    date: "Just now",
    hasAttachments: false,
    labels: [],
    threadId: id,
  };
};

// Enhanced EmailCard component with better visual design
const EmailCard = ({ email }: { email: EmailMetadata }) => {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Format date nicely
  const formattedDate = email.receivedTime
    ? getTimeDifference(email.receivedTime)
    : email.date;

  // Get sender name (without email address)
  const senderName =
    email.sender?.split("<")[0]?.trim() || email.sender || "Unknown";

  // Choose a color based on the first character of the subject or id
  const colorIndex =
    (email.subject?.charCodeAt(0) || email.id.charCodeAt(0)) % 5;
  const gradients = [
    "from-blue-50 to-indigo-100 text-blue-600", // Blue theme
    "from-purple-50 to-purple-100 text-purple-600", // Purple theme
    "from-emerald-50 to-teal-100 text-emerald-600", // Green theme
    "from-amber-50 to-yellow-100 text-amber-600", // Yellow theme
    "from-rose-50 to-pink-100 text-rose-600", // Pink theme
  ];
  const gradient = gradients[colorIndex];

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl overflow-hidden border transition-all duration-300 ${
        hovered
          ? "shadow-lg border-gray-300 dark:border-gray-600 transform scale-[1.02]"
          : "shadow-md border-gray-200 dark:border-gray-700"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 w-full">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              {email.hasAttachments ? (
                <Paperclip className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {email.subject || "No Subject"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center">
                <User size={12} className="mr-1.5 flex-shrink-0" />
                <span className="truncate">{senderName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`ml-2 flex-shrink-0 rounded-full p-1.5 transition-colors ${
              expanded
                ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            aria-label={
              expanded ? "Collapse email details" : "Expand email details"
            }
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Info Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Calendar size={12} className="flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>

            {/* Email Labels */}
            {email.labels && email.labels.length > 0 && (
              <div className="flex items-center space-x-1">
                <Tag size={12} className="flex-shrink-0" />
                <span className="truncate max-w-[100px]">
                  {email.labels[0]}
                  {email.labels.length > 1
                    ? ` +${email.labels.length - 1}`
                    : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Preview */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-100 border border-gray-100 dark:border-gray-700">
            <p className="line-clamp-3">
              {email.snippet || "No preview available"}
            </p>
          </div>

          {/* Labels (when expanded) */}
          {email.labels && email.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {email.labels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  <Tag size={10} className="mr-1" />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* "Open in Gmail" Button */}
      <div className="relative h-10">
        <div
          className={`absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center ${
            hovered ? "opacity-100" : "opacity-90"
          }`}
          onClick={() => openGmailWithEmail(email.threadId)}
        >
          <span>Open in Gmail</span>
          <ExternalLink size={14} className="ml-2" />

          {/* Hover Animation */}
          <div
            className={`absolute inset-0 bg-white opacity-0 ${
              hovered ? "animate-pulse-light" : ""
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Enhanced EmailsContainer component with better visual design
const EmailsContainer = ({
  emailIds,
  visible,
  onClose,
  metadata = {},
  isLoading = false,
}: {
  emailIds: string[];
  visible: boolean;
  onClose: () => void;
  metadata?: Record<string, EmailMetadata>;
  isLoading?: boolean;
}) => {
  if (!visible || emailIds.length === 0) return null;

  // Create email metadata objects from IDs if not provided
  const emails: EmailMetadata[] = emailIds.map(
    (id) => metadata[id] || createFallbackEmailMetadata(id)
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/30 rounded-xl p-5 mt-4 border border-gray-200/70 dark:border-gray-700/70 shadow-sm animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 dark:bg-blue-700 p-2 rounded-full">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-100" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Referenced Emails ({emails.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              These emails were used to generate the response
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close email references"
        >
          <X size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-300 animate-spin"></div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Loading email details...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emails.map((email) => (
            <EmailCard key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function ChatBotPage() {
  const [ragEnabled, setRagEnabled] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [input, setInput] = useState("");
  const { user, loading, error } = useCurrentUser();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElementWithScrollIntoView>(null);
  const inputRef = useRef<HTMLInputElementWithFocus>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // State for managing email references
  const [showEmails, setShowEmails] = useState(false);
  const [currentEmailIds, setCurrentEmailIds] = useState<string[]>([]);
  const [emailMetadata, setEmailMetadata] = useState<
    Record<string, EmailMetadata>
  >({});
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

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
  const { messages, sendMessage, isTyping, emailIds } = useChatBot(ragEnabled);

  // Use an effect hook to update onboarding status based on user.RagQueued
  useEffect(() => {
    if (user?.RagQueued === "inTaskQueue") {
      setOnboardingStatus({
        phase: "initializing",
        fetch: 0,
        save: 0,
        total: 0,
      });
    }
  }, [user?.RagQueued]);

  let count = 0;

  // Update email IDs when new messages arrive
  useEffect(() => {
    const fetchEmailsData = async () => {
      if (emailIds && emailIds.length > 0) {
        setCurrentEmailIds(emailIds);
        setShowEmails(true);
        setIsLoadingEmails(true);

        try {
          console.log("Email IDs to fetch:", emailIds);

          // In a real implementation, you would get this from your auth system
          const refreshToken = user?.refreshToken;

          if (!refreshToken) {
            console.error("No refresh token available for user");
            throw new Error("Authentication required to fetch emails");
          }

          console.log(
            "Using refresh token:",
            refreshToken.substring(0, 5) + "..."
          );

          // Fetch actual email details from Gmail
          const emailDetails = await fetchEmailDetails(emailIds, refreshToken);

          // Check if we got valid data
          const validEmails = Object.values(emailDetails).filter(
            (email) => email.subject !== "Email Not Found"
          );

          console.log(
            `Retrieved ${validEmails.length} valid emails out of ${emailIds.length} requested`
          );

          setEmailMetadata(emailDetails);
        } catch (error) {
          console.error("Error in fetchEmailsData:", error);
          // Create fallback metadata for all email IDs
          const fallbackMetadata = emailIds.reduce((acc, id) => {
            acc[id] = createFallbackEmailMetadata(id);
            return acc;
          }, {} as Record<string, EmailMetadata>);
          setEmailMetadata(fallbackMetadata);
        } finally {
          setIsLoadingEmails(false);
        }
      }
    };

    fetchEmailsData();
  }, [emailIds, user?.refreshToken]);

  // Fetch onboarding progress
  const fetchOnboardingProgress = useCallback(async () => {
    console.log("Fetching progress...");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RAG_URL}/progress?userId=${user?.id}`
      );
      const data = await response.json();
      // have a if statement where if phase is "waiting" dont do anything.

      if (!(data.phase === "waiting")) {
        setOnboardingStatus(data);

        if (count == 0) {
          count++;
          console.log(count + "COUUUUUUUUUUUUUNT");

          let response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboardingRAG/optimisticRemove`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user?.id, count: count }),
            }
          );

          console.log(data);

          if (response.ok) {
            console.log("Optimistic update successful");
          } else {
            console.error("Optimistic update failed");
          }
        }
      }

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
  //when user toggles rag on ----> we do a optimistic update on the frontend which immeidly tells teh user their onboarding has started
  // then we update this field on the backend which then just says "Rag is on".
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
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
  const handlePermissionResponse = (allow: boolean) => {
    setRagEnabled(allow);
    localStorage.setItem("ragPermission", allow.toString());
    setShowPermissionDialog(false);

    if (allow) {
      toggleRag();
    }
  };

  // Toggle RAG functionality
  const toggleRag = async () => {
    if (!user) return;

    const newRagState = !ragEnabled;
    setRagEnabled(newRagState);
    setIsEnablingRag(newRagState);

    //set onboarding status to intiailized and set field in backend to rag is beign rpocessed in quaue.
    //the minute we receive intiailized from teh worker, we must immeidily change the rag processing to off.
    //  set up a if statment to set the onboarding status to intiatilzied if the current user field is enabled
    //other than that we have a constant fetching logic that polls the backend every 2 seconds, which will automaticaly update that backend.

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

      if (newRagState) {
        setOnboardingStatus({
          phase: "initialized",
          fetch: 0,
          save: 0,
          total: 0,
        });
      }

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
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
      {/* Loading Overlay with Improved Animation */}
      {loading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-md w-full mx-4 transform animate-scaleIn">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
              <div className="w-24 h-24 rounded-full border-8 border-black border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Mail className="h-8 w-8 text-black animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold mt-8 mb-2">
              Loading workspace
            </h3>
            <p className="text-gray-500 text-center">
              Preparing your intelligent email assistant...
            </p>
          </div>
        </div>
      )}

      <AppSidebar currentTab="Recall" />
      <div className="flex-1 flex flex-col items-center"> {/* Center content and expand */}

      <div className="ml-14 md:ml-4 self-start z-10"> {/* Keep trigger left-aligned and visible */}
        <SidebarTrigger />
      </div>

      <div className="container mx-auto px-4 h-[calc(100vh-2rem)] py-4 max-w-7xl flex flex-col">
        {/* Header Section with Glass Effect */}
        <div className="space-y-4 mb-4">
          {/* Main header content */}
          <div className="backdrop-blur-md bg-white/80 dark:bg-black/80 rounded-2xl p-1">
            <div className="flex md:flex-row md:justify-between md:items-center gap-6">
              <div className="flex items-center">
                <div className="bg-gradient-to-tr from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-2xl p-3 mr-4 shadow-lg transform hover:scale-105 transition-all">
                  <BrainCircuit className="h-5 w-5 text-white dark:text-gray-900" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent">
                    Recall
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Ask anything about your emails
                  </p>
                </div>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-4 backdrop-blur-md bg-white/80 dark:bg-black/80 px-6 py-3 rounded-xl">
                <UserProfileDropdown
                  name={user?.name || "John Doe"}
                  email={user?.email || "john.doe@example.com"}
                />
              </div>
            </div>
          </div>

          {/* RAG Controls Section */}
          <div className="flex items-center justify-between">
            {/* <Button
              onClick={toggleRag}
              className={`relative group shadow-lg transition-all duration-300 px-6 py-3 rounded-xl ${
                ragEnabled
                  ? "bg-gradient-to-r from-black to-gray-800 text-white"
                  : "bg-gradient-to-r from-red-600 to-red-700 text-white"
              } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                ragEnabled ? "focus:ring-black" : "focus:ring-red-500"
              }`}
              disabled={isProcessing}
            >
              <div className="flex items-center"> 
                <BrainCircuit className="mr-2 h-5 w-5" />
                <span className="font-medium">
                  {ragEnabled ? "RAG Enabled" : "RAG Disabled"}
                </span>
              </div>
            </Button> */}

            <div className="flex items-center space-x-2">
              <Switch
                checked={ragEnabled}
                onClick={toggleRag}
                disabled={isProcessing}
                className="data-[state=checked]:bg-black data-[state=unchecked]:bg-red-600 dark:data-[state=checked]:bg-white dark:data-[state=unchecked]:bg-red-600"
              />
              <Label htmlFor="rag-switch" className="flex items-center">
                <span className="font-medium">
                  {ragEnabled ? "RAG Enabled" : "RAG Disabled"}
                </span>
              </Label>
              
            </div>

            {/* Status Indicators */}
            {isProcessing && (
              <div className="flex-1 ml-4 animate-slideInFromRight">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-lg">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-500/10 rounded-full p-2 mt-1">
                      {getProgressIcon()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-blue-800">
                          {getProgressStatusMessage()}
                        </p>
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {onboardingStatus.total}%
                        </span>
                      </div>
                      <div className="relative h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${onboardingStatus.total}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Card with Glass Effect */}
        <Card className="flex-1 flex flex-col w-full max-w-6xl mx-auto backdrop-blur-md bg-white/80 dark:bg-gray-900/80 shadow-xl border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
          {/* <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-black rounded-xl p-2">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Chat with Recall
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Ask anything about your emails
                  </p>
                </div>
              </div>
              {ragEnabled ? (
                <div className="flex items-center space-x-2 bg-black/90 text-white text-xs px-3 py-1.5 rounded-full">
                  <Database className="h-3.5 w-3.5" />
                  <span className="font-medium">RAG Active</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                  <Info className="h-3.5 w-3.5" />
                  <span className="font-medium">Basic Mode</span>
                </div>
              )}
            </div>
          </CardHeader> */}

          {/* Chat Content with Scroll Indicator */}
          <div className="relative flex-1 flex flex-col min-h-0">
            {isScrolled && (
              <div className="absolute top-0 left-0 right-0 h-6"></div>
            )}
            <CardContent
              className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50 scroll-smooth"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                setIsScrolled(target.scrollTop > 0);
              }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full blur-xl opacity-50"></div>
                    <div className="relative bg-gradient-to-br from-gray-100 to-white rounded-full p-8 shadow-lg">
                      <Mail className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mt-8 mb-3 text-gray-800 dark:text-gray-100">
                    Welcome to Recall
                  </h3>
                  <p className="max-w-md text-gray-500 dark:text-gray-400 mb-8">
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
                        className="group relative bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm text-left transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => {
                          setInput(suggestion);
                          if (inputRef.current) inputRef.current.focus();
                        }}
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-black/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                //take up all remaining space
                <div className="space-y-6">  
                  {messages.map((m, index) => {
                    const isUser = m.role === "user";
                    const isLast = index === messages.length - 1;
                    const messageTime = new Date();

                    return (
                      <div key={index} className="space-y-4 h-full">
                        <div
                          className={`flex ${
                            isUser ? "justify-end" : "justify-start"
                          } ${isLast ? "animate-slideInFromBottom" : ""}`}
                        >
                          {!isUser && (
                            <div className="mr-3 flex-shrink-0">
                              <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-2 shadow-lg">
                                {/* <Mail className="h-5 w-5 text-white" /> */}
                                <BotMessageSquare className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                          <div
                            className={`flex flex-col ${
                              isUser ? "items-end" : "items-start"
                            } max-w-[80%]`}
                          >
                            <div
                              className={`rounded-2xl px-5 py-3 shadow-md ${
                                isUser
                                  ? "bg-black text-white dark:bg-white text-black dark:text-black rounded-tr-none"
                                  : "bg-white dark:bg-black text-black dark:text-white rounded-tl-none"
                              }`}
                            >
                              <div className="relative">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                                {<ReactMarkdown>{m.content}</ReactMarkdown>}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 mt-1 px-2">
                              {/* <span className="text-xs text-gray-400 dark:text-gray-500">
                                {getTimeDifference(messageTime)}
                              </span> */}
                              {isUser && m.content.trim() && (
                                <div className="flex items-center space-x-1">
                                  <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Sent
                                  </span>
                                </div>
                              )}

                              {/* Add button to show referenced emails */}
                              {!isUser &&
                                emailIds &&
                                emailIds.length > 0 &&
                                index === messages.length - 1 && (
                                  <button
                                    onClick={() => setShowEmails(!showEmails)}
                                    className="ml-2 text-xs flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <Mail className="h-3 w-3" />
                                    <span>
                                      {showEmails ? "Hide" : "Show"} referenced
                                      emails ({emailIds.length})
                                    </span>
                                  </button>
                                )}
                            </div>
                          </div>
                          {isUser && (
                            <div className="ml-3 flex-shrink-0">
                              <Avatar className="w-9 h-9 shadow-md transform hover:scale-105 transition-transform">
                                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-white text-sm font-medium">
                                  {user?.email
                                    ? user.email.charAt(0).toUpperCase()
                                    : "U"}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>

                        {/* Display email cards after the last bot message */}
                        {!isUser && index === messages.length - 1 && (
                          <EmailsContainer
                            emailIds={currentEmailIds}
                            visible={showEmails}
                            onClose={() => setShowEmails(false)}
                            metadata={emailMetadata}
                            isLoading={isLoadingEmails}
                          />
                        )}
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start animate-slideInFromBottom">
                      <div className="mr-3 flex-shrink-0">
                        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-2 shadow-lg">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl rounded-tl-none px-5 py-3 shadow-md">
                        <div className="flex space-x-2">
                          <div
                            className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
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
          </div>

          {/* Input Area with Enhanced Design */}
          <CardFooter className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50">
            <form onSubmit={handleSubmit} className="flex w-full space-x-3">
              <div className="relative flex-grow">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white focus:ring-black dark:focus:ring-white rounded-xl py-3 px-4 shadow-sm pr-12 text-gray-900 dark:text-gray-100"
                />
                {/* <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl">😊</span>
                </button> */}
              </div>
              <Button
                type="submit"
                disabled={isTyping || !input.trim()}
                className={`bg-black dark:bg-white text-white dark:text-black rounded-xl px-6 transition-all duration-200 ${
                  input.trim()
                    ? "opacity-100 hover:shadow-lg"
                    : "opacity-50 cursor-not-allowed"
                } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 disabled:transform-none disabled:transition-none`}
              >
                <Send className="h-5 w-5" />
                <span className="ml-2 font-medium">Send</span>
              </Button>
            </form>
          </CardFooter>
        </Card>

        {/* Permission Dialog with Enhanced Design */}
        <Dialog
          open={showPermissionDialog}
          onOpenChange={setShowPermissionDialog}
        >
          <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden dark:bg-gray-900">
            <div className="bg-gradient-to-r from-gray-900 to-black dark:from-blue-600 dark:to-blue-700 text-white p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-white rounded-full blur-md opacity-20"></div>
                  <div className="relative bg-white rounded-full p-4">
                    <Mail className="h-8 w-8 text-black" />
                  </div>
                </div>
              </div>
              <DialogTitle className="text-2xl text-center font-semibold">
                Enable Email Intelligence
              </DialogTitle>
            </div>
            <div className="p-8 dark:bg-gray-900">
              <DialogDescription className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                Enhance your email experience with AI-powered insights and
                intelligent responses.
              </DialogDescription>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl p-5 mb-8">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-100 mb-3 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  How RAG Works
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200 leading-relaxed">
                  RAG technology analyzes your emails securely to provide
                  personalized, context-aware responses. Your data remains
                  private and is never shared with third parties.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start">
                  <div className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-800 dark:to-green-700 rounded-full p-2 mr-4 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Smart Responses
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      Get AI-powered answers based on your email context
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-800 dark:to-green-700 rounded-full p-2 mr-4 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Secure Processing
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      End-to-end encryption keeps your data safe
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-8 py-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => router.push("/rules")}
                  className="w-full sm:w-auto border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl px-6 py-2.5"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => toggleRag()}
                  className="w-full sm:w-auto bg-gradient-to-r from-gray-900 to-black dark:from-blue-600 dark:to-blue-700 hover:from-black hover:to-gray-900 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white rounded-xl px-6 py-2.5 transform hover:scale-105 transition-all duration-200"
                >
                  Enable Intelligence
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Animations */}
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

        @keyframes slideInFromRight {
          from {
            transform: translateX(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInFromBottom {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(100%);
          }
        }

        @keyframes pulse-light {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.1;
          }
          100% {
            opacity: 0;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }

        .animate-slideInFromRight {
          animation: slideInFromRight 0.3s ease-out forwards;
        }

        .animate-slideInFromBottom {
          animation: slideInFromBottom 0.3s ease-out forwards;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-pulse-light {
          animation: pulse-light 2s infinite;
        }

        .scroll-smooth {
          scroll-behavior: smooth;
        }

        /* Add gradient scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #60a5fa);
          border-radius: 3px;
        }
      `}</style>
    
    </div>
    </SidebarProvider>
  );
}
