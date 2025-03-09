import { useState, useEffect, useCallback } from "react";
import useCurrentUser from "./useCurrentUser";

interface Message {
  role: "user" | "bot";
  content: string;
}

export function useChatBot(ragEnabled: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { user, loading, error } = useCurrentUser();
  const [emailIds, setEmailIds] = useState<string[]>([]);

  // Fetch chat history when component mounts or user changes
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

  // Save message to Firebase
  const saveMessageToFirebase = async (sender: string, content: string) => {
    if (!user?.id) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/message`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender,
          message: content,
        }),
      });
    } catch (error) {
      console.error("Error saving message to Firebase:", error);
    }
  };

  // Send message function
  const sendMessage = useCallback(
    async (content: string) => {
      if (loading) {
        console.warn("User data is still loading...");
        return;
      }

      if (error) {
        console.error("Error fetching user:", error);
        return;
      }

      if (!user || !user.id) {
        console.warn("User is not available yet. Cannot send message.");
        return;
      }

      // Add user message to UI immediately
      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);

      // Save user message to Firebase
      await saveMessageToFirebase("user", content);

      setIsTyping(true);

      try {
        setEmailIds([]);
        // Send message to chatbot API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_RAG_URL}/augmentedEmailSearch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, query: content }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();
        console.log(data.completion);

        // Add AI response to the chat
        const botMessage: Message = {
          role: "bot",
          content: data.completion.response,
        };
        setMessages((prev) => [...prev, botMessage]);

        // Save bot message to Firebase
        await saveMessageToFirebase("bot", data.completion.response);
        console.log(
          `Message sent to chatbot API. Response Ids: ${data.completion.emailIds.join(
            ", "
          )}`
        );
        setEmailIds(data.completion.emailIds);
      } catch (error) {
        console.error("Error sending message:", error);
        // Add error message
        const errorMessage: Message = {
          role: "bot",
          content:
            "Sorry, I couldn't process your request. Please try again later.",
        };
        setMessages((prev) => [...prev, errorMessage]);

        // Save error message to Firebase
        await saveMessageToFirebase("bot", errorMessage.content);
      } finally {
        setIsTyping(false);
      }
    },
    [ragEnabled, user, loading, error]
  );

  return { messages, sendMessage, isTyping, emailIds };
}
