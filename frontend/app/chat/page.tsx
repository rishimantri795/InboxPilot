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
  const { messages, sendMessage, isTyping, emailIds, status } =
    useChatBot(ragEnabled);

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
          if (user) {
            user.RagQueued = "processed";
          }

          if (response.ok) {
            console.log("Optimistic update successful");
          } else {
            console.error("Optimistic update failed");
          }
        }
      }

      console.log("Onboarding progress:", data);

      if (data.phase === "complete" && user?.RagQueued === "inTaskQueue") {
        setOnboardingStatus({
          phase: "initializing",
          fetch: 0,
          save: 0,
          total: 0,
        });
      }

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

  useEffect(() => {
    setIsEnablingRag(user?.RAG === "enabled");
  }, []);

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

    // Force reset completion state before setting to initializing
    // This ensures we don't show the opposite completion state immediately
    setOnboardingStatus({
      phase: "waiting",
      fetch: 0,
      save: 0,
      total: 0,
    });

    // Use setTimeout to ensure the reset is applied before showing loading state
    setTimeout(() => {
      // Optimistic update
      setOnboardingStatus({
        phase: "initializing",
        fetch: 0,
        save: 0,
        total: 5, // Start with a small progress percentage for immediate feedback
      });
    }, 50);

    isProcessing = true;

    try {
      // Optimistic update using backend endpoint
      // await fetch(
      //   `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboardingRAG/optimisticRemove`,
      //   {
      //     method: "POST",
      //     credentials: "include",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       userId: user.id,
      //       ragState: newRagState ? "enabling" : "disabling",
      //     }),
      //   }
      // );

      // Actual toggle operation
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

      // Start polling for progress
      user.RagQueued = "inTaskQueue";
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
        return "Vectorizing emails...";
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
    if (ragEnabled) {
      return "RAG setup complete! Enhanced responses are now enabled.";
    } else {
      return "RAG has been disabled. Your emails have been removed from the database.";
    }
  };

  // Determine if we're in an active processing state
  let isProcessing =
    onboardingStatus.phase !== "complete" &&
    onboardingStatus.phase !== "error" &&
    onboardingStatus.phase !== "waiting";

  // Redirect if no user is found
  if (!loading && !user) {
    router.push("/");
    return null;
  }
  if (user?.provider === "microsoft") {
    return (
      <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center z-50 text-white text-center px-6">
        <Mail className="w-10 h-10 mb-4 text-white animate-pulse" />
        <h2 className="text-3xl font-bold mb-2">Coming Soon</h2>
        <p className="text-lg text-gray-300 max-w-md mb-6">
          Outlook support for Recall is on its way. Hang tight — we're working
          on it!
        </p>
        <a
          href="/rules"
          className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
        >
          Back To Rules
        </a>
      </div>
    );
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
      <div className="flex-1 flex flex-col items-center">
        {" "}
        {/* Center content and expand */}
        <div className="ml-14 md:ml-4 self-start z-10">
          {" "}
          {/* Keep trigger left-aligned and visible */}
          <SidebarTrigger />
        </div>
        <div className="container mx-auto px-4 h-[calc(100vh-2rem)] py-4 max-w-7xl flex flex-col">
          {/* Header Section with Glass Effect */}
          <div className="space-y-4 mb-4">
            {/* Main header content */}
            <div className="backdrop-blur-md rounded-2xl p-1">
              <div className="flex md:flex-row md:justify-between md:items-center gap-6">
                <div className="flex items-center">
                  {/* <div className="bg-gradient-to-tr from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-2xl p-3 mr-4 shadow-lg transform hover:scale-105 transition-all">
                    <BrainCircuit className="h-5 w-5 text-white dark:text-gray-900" />
                  </div> */}
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent">
                      Recall
                    </h1>
                    {/* <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      Ask anything about your emails
                    </p> */}
                  </div>
                </div>

                {/* User Profile */}
                <div className="flex items-center space-x-4 backdrop-blur-md px-6 py-3 rounded-xl">
                  <UserProfileDropdown
                    name={user?.name || "John Doe"}
                    email={user?.email || "john.doe@example.com"}
                  />
                </div>
              </div>
            </div>

            {/* RAG Controls Section - Fixed version */}
            <div className="relative h-[90px]">
              {" "}
              {/* Fixed height container to prevent layout shifts */}
              <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-sm border border-gray-300/80 dark:border-gray-700/80 overflow-hidden transition-all duration-300">
                <div className="flex items-center p-4">
                  <div className="flex-shrink-0 relative w-9 h-9">
                    {" "}
                    {/* Fixed width/height for icon container */}
                    {/* Icon with status indicators */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${
                        isProcessing
                          ? "from-blue-600 to-blue-700"
                          : onboardingStatus.phase === "complete"
                          ? "from-green-600 to-green-700"
                          : "from-gray-900 to-black dark:from-blue-600 dark:to-blue-700"
                      } rounded-full p-2 transition-colors duration-500`}
                    >
                      {isProcessing ? (
                        <RefreshCw className="h-5 w-5 text-white animate-spin" />
                      ) : onboardingStatus.phase === "complete" ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <BrainCircuit className="h-5 w-5 text-white" />
                      )}
                    </div>
                    {/* Circular progress indicator */}
                    {isProcessing && (
                      <div className="absolute -inset-1 rounded-full border-2 border-blue-400/30 border-t-blue-500"></div>
                    )}
                  </div>

                  <div className="ml-3 flex-1 min-w-0">
                    {" "}
                    {/* Added min-width to prevent text overflow */}
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        {" "}
                        {/* Ensure text has room and doesn't overlap switch */}
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          Intelligent Email Search
                        </h3>
                        <div className="flex items-center mt-0.5">
                          {isProcessing ? (
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center truncate">
                              <span className="animate-pulse mr-1.5 flex-shrink-0">
                                •
                              </span>
                              <span className="truncate">
                                {getProgressStatusMessage()}
                              </span>
                              <span className="ml-2 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                {onboardingStatus.total}%
                              </span>
                            </p>
                          ) : onboardingStatus.phase === "complete" ? (
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center truncate">
                              <span className="mr-1 flex-shrink-0">✓</span>
                              <span className="truncate">
                                {getCompletionMessage()}
                              </span>
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {ragEnabled ? "Enabled" : "Disabled"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-2 flex-shrink-0 z-10">
                        {" "}
                        {/* Added z-index to ensure clickability */}
                        {/* Simplified toggle styles */}
                        <Switch
                          checked={ragEnabled}
                          onClick={toggleRag}
                          disabled={isProcessing}
                          className={
                            isProcessing
                              ? "data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-blue-300"
                              : onboardingStatus.phase === "complete"
                              ? "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-green-300"
                              : "data-[state=checked]:bg-black dark:bg-white data-[state=unchecked]:bg-gray-300"
                          }
                        />
                        <Label htmlFor="rag-switch" className="font-medium">
                          {ragEnabled ? "ON" : "OFF"}
                        </Label>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700/50 rounded-full mt-2 overflow-hidden">
                      {isProcessing && (
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 transition-all duration-700 ease-out rounded-full"
                          style={{ width: `${onboardingStatus.total}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                        </div>
                      )}
                      {onboardingStatus.phase === "complete" && (
                        <div className="h-full w-full bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-full">
                          <div className="absolute inset-0 bg-white/20 animate-shimmer-slow"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Background effects - position fixed to prevent layout shifts */}
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 rounded-xl blur-sm animate-pulse-slow opacity-70 pointer-events-none"></div>
              )}
              {onboardingStatus.phase === "complete" && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/30 to-green-400/0 rounded-xl blur-sm animate-pulse-slow opacity-70 pointer-events-none"></div>
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
                                        {showEmails ? "Hide" : "Show"}{" "}
                                        referenced emails ({emailIds.length})
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

                    {/* Typing indicator with dot animation - show when isTyping is true but no status */}
                    {isTyping && !status && (
                      <div
                        className="flex justify-start animate-slideInFromBottom"
                        aria-live="polite"
                        role="status"
                      >
                        <div className="mr-3 flex-shrink-0">
                          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-2 shadow-lg">
                            <Mail
                              className="h-5 w-5 text-white"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl rounded-tl-none px-5 py-3 shadow-md">
                          <div
                            className="flex space-x-2"
                            aria-label="AI is thinking"
                          >
                            <div
                              className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce motion-reduce:animate-none"
                              style={{ animationDelay: "0ms" }}
                              aria-hidden="true"
                            ></div>
                            <div
                              className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce motion-reduce:animate-none"
                              style={{ animationDelay: "150ms" }}
                              aria-hidden="true"
                            ></div>
                            <div
                              className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce motion-reduce:animate-none"
                              style={{ animationDelay: "300ms" }}
                              aria-hidden="true"
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LLM Status Indicator - Show thinking process when we have a status */}
                    {isTyping && status && (
                      <div
                        className="w-full my-1.5 animate-slideInFromBottom opacity-90"
                        aria-live="polite"
                        role="status"
                      >
                        <div className="relative w-full max-w-xl mx-auto overflow-hidden">
                          {/* Status bar content */}
                          <div className="relative flex items-center py-1.5">
                            <div className="flex-shrink-0 mr-2">
                              <div className="bg-gradient-to-br from-blue-400/60 to-indigo-500/60 dark:from-blue-500/70 dark:to-indigo-500/70 rounded-full p-1 shadow-sm relative group">
                                <BrainCircuit
                                  className="h-2.5 w-2.5 text-white group-hover:scale-110 transition-transform"
                                  aria-hidden="true"
                                />
                                {/* Extremely subtle pulsing ring */}
                                <div
                                  className="absolute inset-0 rounded-full border border-blue-400/20 dark:border-blue-400/30 animate-ping-slow motion-reduce:animate-none"
                                  aria-hidden="true"
                                ></div>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <div className="text-xs text-blue-600/80 dark:text-blue-300/80 font-medium animate-fade-in-fast motion-reduce:animate-none truncate flex-1">
                                  <span
                                    className="animate-status-in motion-reduce:animate-none block"
                                    aria-label={`AI thinking: ${status}`}
                                  >
                                    {status}
                                  </span>
                                </div>

                                {/* Mini status dots - even smaller */}
                                <div className="flex space-x-0.5 items-center pr-1">
                                  <div className="w-0.5 h-0.5 rounded-full bg-blue-400/70 dark:bg-blue-400/70 animate-pulse-fast"></div>
                                  <div
                                    className="w-0.5 h-0.5 rounded-full bg-blue-400/70 dark:bg-blue-400/70 animate-pulse-fast"
                                    style={{ animationDelay: "0.3s" }}
                                  ></div>
                                  <div
                                    className="w-0.5 h-0.5 rounded-full bg-blue-400/70 dark:bg-blue-400/70 animate-pulse-fast"
                                    style={{ animationDelay: "0.6s" }}
                                  ></div>
                                </div>
                              </div>

                              {/* Super thin progress line */}
                              <div className="h-[1px] w-full mt-1 bg-blue-100/30 dark:bg-blue-800/15 rounded-full overflow-hidden">
                                <div
                                  className="h-full w-full bg-gradient-to-r from-blue-400/60 via-indigo-400/60 to-blue-400/60 dark:from-blue-400/50 dark:via-indigo-400/50 dark:to-blue-400/50 animate-thinking-progress motion-reduce:w-3/4 motion-reduce:animate-none rounded-full"
                                  aria-hidden="true"
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Even more subtle particles - practically invisible */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                            <div className="particle-1-subtle dark:opacity-30"></div>
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

          @keyframes shimmer-slow {
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

          @keyframes pulse-slow {
            0% {
              opacity: 0.3;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.3;
            }
          }

          @keyframes glow-translate {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          @keyframes shine {
            0% {
              box-shadow: 0 0 8px 2px rgba(22, 163, 74, 0.1);
            }
            50% {
              box-shadow: 0 0 12px 3px rgba(22, 163, 74, 0.2);
            }
            100% {
              box-shadow: 0 0 8px 2px rgba(22, 163, 74, 0.1);
            }
          }

          @keyframes thinking-progress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(30%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          @keyframes pulse-gentle {
            0% {
              transform: scale(1);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.1);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0.7;
            }
          }

          @keyframes pulse-fast {
            0%,
            100% {
              opacity: 0.3;
            }
            50% {
              opacity: 1;
            }
          }

          @keyframes ping-slow {
            0% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.2;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }

          @keyframes fade-in-fast {
            0% {
              opacity: 0.5;
            }
            100% {
              opacity: 1;
            }
          }

          @keyframes status-in {
            0% {
              transform: translateY(5px);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes neural-1 {
            0%,
            100% {
              transform: scaleY(0.8);
              opacity: 0.5;
            }
            50% {
              transform: scaleY(1.2);
              opacity: 0.8;
            }
          }

          @keyframes neural-2 {
            0%,
            100% {
              transform: scaleY(1);
              opacity: 0.3;
            }
            70% {
              transform: scaleY(1.5);
              opacity: 0.6;
            }
          }

          @keyframes neural-3 {
            0%,
            100% {
              transform: scaleX(0.9);
              opacity: 0.4;
            }
            60% {
              transform: scaleX(1.1);
              opacity: 0.7;
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
          .animate-thinking-progress {
            animation: thinking-progress 1.8s infinite ease-in-out;
          }
          .animate-pulse-gentle {
            animation: pulse-gentle 2s infinite ease-in-out;
          }
          .animate-pulse-fast {
            animation: pulse-fast 1s infinite ease-in-out;
          }
          .animate-ping-slow {
            animation: ping-slow 2s infinite ease-in-out;
          }
          .animate-fade-in-fast {
            animation: fade-in-fast 0.3s ease-out forwards;
          }
          .animate-status-in {
            animation: status-in 0.5s ease-out forwards;
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
          .animate-shimmer-slow {
            animation: shimmer-slow 3s infinite;
          }
          .animate-pulse-light {
            animation: pulse-light 1s infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s infinite;
          }
          .animate-neural-1 {
            animation: neural-1 1.5s ease-in-out infinite;
          }
          .animate-neural-2 {
            animation: neural-2 2s ease-in-out infinite;
          }
          .animate-neural-3 {
            animation: neural-3 1.8s ease-in-out infinite;
          }
          .animate-glow-translate {
            animation: glow-translate 8s infinite;
          }
          .animate-shine {
            animation: shine 3s infinite;
          }

          .scroll-smooth {
            scroll-behavior: smooth;
          }

          /* Background pattern for completion message */
          .bg-grid-pattern {
            background-image: linear-gradient(
                to right,
                rgba(0, 0, 0, 0.05) 1px,
                transparent 1px
              ),
              linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0.05) 1px,
                transparent 1px
              );
            background-size: 20px 20px;
          }

          .dark .bg-grid-pattern {
            background-image: linear-gradient(
                to right,
                rgba(255, 255, 255, 0.05) 1px,
                transparent 1px
              ),
              linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0.05) 1px,
                transparent 1px
              );
          }

          /* Dark mode adjustments for success checkmark */
          .dark .success-checkmark .check-icon {
            border-color: #4ade80;
          }
          .dark .success-checkmark .check-icon .icon-line {
            background-color: #4ade80;
          }
          .dark .success-checkmark .check-icon .icon-circle {
            border-color: rgba(74, 222, 128, 0.5);
          }

          /* Add motion-reduce variants for all animations */
          @media (prefers-reduced-motion: reduce) {
            .motion-reduce\:animate-none {
              animation: none !important;
            }
            .motion-reduce\:w-3\/4 {
              width: 75%;
            }
          }

          @keyframes gradient-x {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          @keyframes thinking-progress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(30%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          @keyframes float-across-1 {
            0% {
              opacity: 0;
              transform: translateX(-10px) translateY(10px);
            }
            20% {
              opacity: 0.8;
            }
            80% {
              opacity: 0.8;
            }
            100% {
              opacity: 0;
              transform: translateX(calc(100vw - 20px)) translateY(-10px);
            }
          }

          @keyframes float-across-2 {
            0% {
              opacity: 0;
              transform: translateX(-20px) translateY(0px);
            }
            20% {
              opacity: 0.7;
            }
            70% {
              opacity: 0.7;
            }
            100% {
              opacity: 0;
              transform: translateX(calc(100vw - 10px)) translateY(15px);
            }
          }

          @keyframes float-across-3 {
            0% {
              opacity: 0;
              transform: translateX(-15px) translateY(-10px);
            }
            30% {
              opacity: 0.6;
            }
            60% {
              opacity: 0.6;
            }
            100% {
              opacity: 0;
              transform: translateX(calc(100vw - 30px)) translateY(5px);
            }
          }

          .animate-thinking-progress {
            animation: thinking-progress 1.8s infinite ease-in-out;
          }
          .animate-gradient-x {
            background-size: 200% 100%;
            animation: gradient-x 15s ease infinite;
          }
          .animate-pulse-gentle {
            animation: pulse-gentle 2s infinite ease-in-out;
          }
          .animate-pulse-fast {
            animation: pulse-fast 1s infinite ease-in-out;
          }
          .animate-ping-slow {
            animation: ping-slow 2s infinite ease-in-out;
          }
          .animate-fade-in-fast {
            animation: fade-in-fast 0.3s ease-out forwards;
          }
          .animate-status-in {
            animation: status-in 0.5s ease-out forwards;
          }

          /* Particle animations */
          .particle-1 {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: linear-gradient(
              to right,
              rgba(99, 102, 241, 0.3),
              rgba(79, 70, 229, 0.3)
            );
            top: 30%;
            left: 0;
            animation: float-across-1 12s linear infinite;
          }

          .particle-2 {
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: linear-gradient(
              to right,
              rgba(59, 130, 246, 0.3),
              rgba(37, 99, 235, 0.3)
            );
            top: 60%;
            left: 0;
            animation: float-across-2 8s linear infinite;
            animation-delay: 2s;
          }

          .particle-3 {
            position: absolute;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: linear-gradient(
              to right,
              rgba(139, 92, 246, 0.3),
              rgba(124, 58, 237, 0.3)
            );
            top: 20%;
            left: 0;
            animation: float-across-3 15s linear infinite;
            animation-delay: 5s;
          }

          .animate-shimmer {
            animation: shimmer 2s infinite;
          }

          /* Subtle particles */
          .particle-1-subtle {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: linear-gradient(
              to right,
              rgba(99, 102, 241, 0.2),
              rgba(79, 70, 229, 0.2)
            );
            top: 40%;
            left: 0;
            animation: float-across-1 15s linear infinite;
          }

          .particle-2-subtle {
            position: absolute;
            width: 3px;
            height: 3px;
            border-radius: 50%;
            background: linear-gradient(
              to right,
              rgba(59, 130, 246, 0.2),
              rgba(37, 99, 235, 0.2)
            );
            top: 60%;
            left: 0;
            animation: float-across-2 12s linear infinite;
            animation-delay: 3s;
          }
        `}</style>
      </div>
    </SidebarProvider>
  );
}
