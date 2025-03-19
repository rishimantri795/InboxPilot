const express = require("express");
const router = express.Router();
const { saveMessage, getChatHistory, deleteChatHistory } = require("../utils/chatService.js");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

// Save a new message
router.post("/message", isAuthenticated, async (req, res) => {
  try {
    const { sender, message } = req.body;
    
    if (!sender || !message) {
      return res.status(400).json({ error: "Sender and message are required" });
    }
    
    if (sender !== "user" && sender !== "bot") {
      return res.status(400).json({ error: "Sender must be 'user' or 'bot'" });
    }
    
    const userId = req.user.id;
    const messageId = await saveMessage(userId, sender, message);
    
    res.status(201).json({ messageId });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// Get chat history for current user
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 1500;
    
    const messages = await getChatHistory(userId, limit);
    res.json({ messages });
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ error: "Failed to retrieve chat history" });
  }
});

// Delete chat history for current user
router.delete("/history", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    await deleteChatHistory(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat history:", error);
    res.status(500).json({ error: "Failed to delete chat history" });
  }
});

module.exports = router;