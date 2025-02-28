import { useState, useEffect, useCallback } from "react"
import useCurrentUser from "./useCurrentUser"

// Helper function to generate random responses
const generateRandomResponse = (): string => {
  const responses = [
    "This is a random response from the chatbot.",
    "I'm just a placeholder for now. The real AI is coming soon!",
    "Beep boop. Random message generator activated.",
    "I'm not very smart yet, but I'm storing your messages in the database!",
    "This is just a simulation. The real AI is still in development.",
    "Random string response #" + Math.floor(Math.random() * 1000).toString(),
    "My responses are completely random at this point.",
    "I'm storing this conversation for future training purposes.",
    "Hello from the random response generator!",
    "This response was randomly selected from a predefined list."
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

export const useChatBot = (ragEnabled: boolean) => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const { user } = useCurrentUser()

  // Fetch chat history when component mounts or user changes
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/history`, {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          const formattedMessages = data.messages.map((msg: any) => ({
            role: msg.sender,
            content: msg.message,
          }))
          setMessages(formattedMessages)
        } else {
          console.error("Failed to fetch chat history")
        }
      } catch (error) {
        console.error("Error fetching chat history:", error)
      }
    }

    fetchChatHistory()
  }, [user?.id])

  // Save message to Firebase
  const saveMessageToFirebase = async (sender: string, content: string) => {
    if (!user?.id) return

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
      })
    } catch (error) {
      console.error("Error saving message to Firebase:", error)
    }
  }
  
  // Send message function
  const sendMessage = useCallback(
    async (inputMessage: string) => {
      // Add user message to UI immediately
      const userMessage = { role: "user", content: inputMessage }
      setMessages((prev) => [...prev, userMessage])
      
      // Save user message to Firebase
      await saveMessageToFirebase("user", inputMessage)
      
      setIsTyping(true)

      try {
        // Instead of calling the API, generate a random response
        // Add a slight delay to simulate processing time (optional)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate random response
        const randomResponse = generateRandomResponse();
        const botMessage = { role: "bot", content: randomResponse }
        
        // Update UI with bot response
        setMessages((prev) => [...prev, botMessage])
        
        // Save bot message to Firebase
        await saveMessageToFirebase("bot", randomResponse)
      } catch (error) {
        console.error("Error generating random response:", error)
        // Add error message
        const errorMessage = { 
          role: "bot", 
          content: "Sorry, I couldn't process your request. Please try again later." 
        }
        setMessages((prev) => [...prev, errorMessage])
        
        // Save error message to Firebase
        await saveMessageToFirebase("bot", errorMessage.content)
      } finally {
        setIsTyping(false)
      }
    },
    [ragEnabled, user?.id]
  )

  return { messages, sendMessage, isTyping }
}