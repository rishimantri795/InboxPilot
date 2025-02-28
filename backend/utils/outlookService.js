const axios = require("axios");

const admin = require("../api/firebase");
const db = admin.firestore();

async function subscribeToOutlookEmails(accessToken) {
  try {
    const existingSubscriptions = await axios.get("https://graph.microsoft.com/v1.0/subscriptions", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/subscriptions",
      {
        changeType: "created",
        notificationUrl: process.env.NOTIFICATION_URL, // Ensure this URL is correct
        resource: "me/messages",
        expirationDateTime: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiry
        clientState: "random_secret_value",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Subscription Created Successfully!");
    // console.log("🔹 Subscription ID:", response.data.id);
    // console.log("🔹 Expiration:", response.data.expirationDateTime);

    return response.data; // Return the response to be used elsewhere if needed
  } catch (error) {
    console.error("❌ Error creating subscription:", error.response ? error.response.data : error.message);
  }
}

const getEmailById = async (emailId, accessToken) => {
  try {
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching email details 123:", error.response ? error.response.data : error.message);
    return null;
  }
};

async function getRefreshTokenOutlook(userId) {
  const userDoc = await db.collection("Users").doc(userId).get();
  if (!userDoc.exists) {
    throw new Error("❌ No refresh token found for this user.");
  }
  return userDoc.data().refreshToken;
}

async function getAccessTokenFromRefreshTokenOutlook(refreshToken) {
  try {
    const response = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("✅ New Access Token:...");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error getting new access token:", error.response ? error.response.data : error.message);
    throw error;
  }
}

async function applyCategoryToOutlookEmail(emailId, accessToken, category) {
  try {
    // Step 1: Fetch the latest email details to get the current changeKey
    const emailResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const latestEmail = emailResponse.data;
    const changeKey = latestEmail.changeKey; // Extract the latest changeKey

    // Step 2: Apply the category using the updated changeKey
    const response = await axios.patch(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
      {
        categories: [category],
        "@odata.etag": changeKey, // Ensure the latest changeKey is used
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Category "${category}" applied to email ${emailId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error applying category:", error.response ? error.response.data : error.message);
    throw error;
  }
}

async function archiveOutlookEmail(emailId, accessToken) {
  try {
    const archiveFolderResponse = await axios.get("https://graph.microsoft.com/v1.0/me/mailFolders/Archive", { headers: { Authorization: `Bearer ${accessToken}` } });
    const archiveFolderId = archiveFolderResponse.data.id;

    const moveResponse = await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${emailId}/move`, { destinationId: archiveFolderId }, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
    return moveResponse.data;
  } catch (error) {
    console.error("Error archiving email:", error.response ? error.response.data : error.message);
    throw error;
  }
}

async function favoriteOutlookEmail(emailId, accessToken) {
  try {
    const patchResponse = await axios.patch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, { flag: { flagStatus: "flagged" } }, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
    return patchResponse.data;
  } catch (error) {
    console.error("Error favoriting email:", error.response ? error.response.data : error.message);
    throw error;
  }
}

async function forwardOutlookEmail(emailId, accessToken, toRecipients, comment = "") {
  console.log("HIIII", toRecipients);
  if (!toRecipients || !Array.isArray(toRecipients) || toRecipients.length === 0) {
    throw new Error("Missing or invalid toRecipients array.");
  }
  try {
    const formattedRecipients = toRecipients.map((email) => ({ emailAddress: { address: email } }));

    await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${emailId}/forward`, { comment, toRecipients: formattedRecipients }, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error forwarding email:", error.response ? error.response.data : error.message);
    throw error;
  }
}

async function createOutlookDraft(emailId, draftText, accessToken) {
  try {
    // Create a draft reply for the given email
    const createDraftResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/createReply`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const replyDraft = createDraftResponse.data;
    
    // Update the draft reply with the provided text
    const updateDraftResponse = await axios.patch(
      `https://graph.microsoft.com/v1.0/me/messages/${replyDraft.id}`,
      {
        body: {
          contentType: "Text",
          content: draftText,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    return updateDraftResponse.data;
  } catch (error) {
    console.error(
      "Error creating draft reply email:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

async function storeLatestMessageId(userId, messageId) {
  await db.collection("Users").doc(userId).update({ latestProcessedMessageId: messageId });
}

async function getLatestMessageId(userId) {
  const userDoc = await db.collection("Users").doc(userId).get();
  return userDoc.exists ? userDoc.data().latestProcessedMessageId : null;
}

module.exports = { archiveOutlookEmail, favoriteOutlookEmail, forwardOutlookEmail, createOutlookDraft, subscribeToOutlookEmails, getEmailById, getAccessTokenFromRefreshTokenOutlook, getRefreshTokenOutlook, applyCategoryToOutlookEmail, storeLatestMessageId, getLatestMessageId };
