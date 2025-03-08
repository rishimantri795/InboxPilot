const admin = require("../api/firebase.js");
const db = admin.firestore();

/**
 * Saves a chat message to Firestore as a subcollection of the user document
 * @param {string} userId - User ID for the chat
 * @param {string} sender - Message sender ('user' or 'bot')
 * @param {string} message - Message content
 * @returns {Promise<string>} - ID of the created message document
 */
const saveMessage = async (userId, sender, message) => {
  try {
    // Reference to the user's chats subcollection
    const chatCollection = db
      .collection("Users")
      .doc(userId)
      .collection("chats");

    // Add message to the chats subcollection
    const messageRef = await chatCollection.add({
      sender,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Message saved for user ${userId} with ID: ${messageRef.id}`);
    return messageRef.id;
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw error;
  }
};

/**
 * Retrieves chat history for a user
 * @param {string} userId - User ID for the chat
 * @param {number} limit - Maximum number of messages to retrieve (optional)
 * @returns {Promise<Array>} - Array of message objects
 */
const getChatHistory = async (userId, limit = 50) => {
  try {
    const messagesRef = db
      .collection("Users")
      .doc(userId)
      .collection("chats")
      .orderBy("timestamp", "asc")
      .limit(limit);

    const snapshot = await messagesRef.get();

    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        sender: data.sender,
        message: data.message,
        timestamp: data.timestamp ? data.timestamp.toDate() : null,
      });
    });

    return messages;
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    throw error;
  }
};

/**
 * Deletes a user's entire chat history
 * @param {string} userId - User ID for the chat
 * @returns {Promise<void>}
 */
const deleteChatHistory = async (userId) => {
  try {
    const messagesRef = db.collection("Users").doc(userId).collection("chats");

    const snapshot = await messagesRef.get();

    // Delete each document in a batch
    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Chat history deleted for user ${userId}`);
  } catch (error) {
    console.error("Error deleting chat history:", error);
    throw error;
  }
};

module.exports = {
  saveMessage,
  getChatHistory,
  deleteChatHistory,
};
