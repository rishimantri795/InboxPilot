import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import useCurrentUser from "./useCurrentUser";

interface Message {
  role: "user" | "bot";
  content: string;
}

export function useChatBot(ragEnabled: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<string>("");
  const { user, loading, error } = useCurrentUser();
  const [emailIds, setEmailIds] = useState<string[]>([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    console.log(status);
  }, [status]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (loading || !user?.id) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/history`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          const formattedMessages = data.messages.map((msg: any) => ({
            role: msg.sender,
            content: msg.message,
          }));
          setMessages(formattedMessages);
        } else {
          console.error("Failed to fetch chat history");
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, [user?.id, loading]);

  // Establish WebSocket connection
  useEffect(() => {
    if (loading || error || !user?.id) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_RAG_URL || "http://localhost:3023",
      {
        query: { userId: user.id, refreshToken: user.refreshToken },
        reconnection: true,
        reconnectionDelay: 1000,
      }
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("WebSocket connected");
    });

    newSocket.on("confirmation", (data) => {
      const botMessage: Message = { role: "bot", content: data.message };
      setMessages((prev) => [...prev, botMessage]);
      setStatus("awaiting confirmation");
      setIsTyping(false);
      setEmailIds(data.emailId ? [data.emailId] : []);
    });

    newSocket.on("status", (status) => {
      setStatus(status);
      setIsTyping(status !== "awaiting confirmation");
    });

    newSocket.on("response", (data) => {
      console.log("Received bot response from websocket+++++++++++++++");
      setStatus("");
      const botMessage: Message = {
        role: "bot",
        content: data.response || data.message,
      };
      setMessages((prev) => [...prev, botMessage]);
      saveMessageToFirebase("bot", botMessage.content);
      setEmailIds(data.emailIds || []);
      setIsTyping(false);
    });

    newSocket.on("error", (errorMsg) => {
      const errorMessage: Message = { role: "bot", content: errorMsg };
      setMessages((prev) => [...prev, errorMessage]);
      saveMessageToFirebase("bot", errorMessage.content);
      setIsTyping(false);
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [user?.id, loading, error]);

  // Save message to Firebase
  const saveMessageToFirebase = async (sender: string, content: string) => {
    if (!user?.id) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/message`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, message: content }),
      });
    } catch (error) {
      console.error("Error saving message to Firebase:", error);
    }
  };

  // Send message via WebSocket
  const sendMessage = useCallback(
    async (content: string) => {
      if (loading || error || !user || !user.id || !socket) {
        console.warn("Cannot send message: User or socket not available.");
        return;
      }

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      // await saveMessageToFirebase("user", content); // changed

      if (status === "awaiting confirmation") {
        socket.emit("confirmationResponse", content);
        return;
      }

      socket.emit("fromclient", content);
      setIsTyping(true);
    },
    [user, loading, error, socket, status]
  );

  return {
    messages,
    sendMessage,
    isTyping,
    emailIds,
    status,
  };
}
