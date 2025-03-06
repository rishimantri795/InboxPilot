const axios = require("axios");

const admin = require("../api/firebase");
const db = admin.firestore();

async function subscribeToOutlookEmails(accessToken) {
  try {
    const response = await axios.post(
      "https://graph.microsoft.com/v1.0/subscriptions",
      {
        changeType: "created",
        notificationUrl: process.env.NOTIFICATION_URL, // Ensure this URL is correct
        resource: "me/mailFolders('inbox')/messages", // This targets only the inbox folder
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

async function unsubscribeToOutlookEmails(accessToken) {
  try {
    // Get all current subscriptions
    const subscriptionsResponse = await axios.get("https://graph.microsoft.com/v1.0/subscriptions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const subscriptions = subscriptionsResponse.data.value || [];
    console.log(`Found ${subscriptions.length} active Outlook subscriptions`);

    if (subscriptions.length === 0) {
      return { success: true, message: "No active subscriptions to remove" };
    }

    // Delete each subscription
    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        axios.delete(`https://graph.microsoft.com/v1.0/subscriptions/${subscription.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        })
      )
    );

    // Count successful deletions
    const successful = results.filter((r) => r.status === "fulfilled").length;

    return {
      success: true,
      message: `Unsubscribed from ${successful} of ${subscriptions.length} subscriptions`,
    };
  } catch (error) {
    console.error("❌ Error unsubscribing from Outlook:", error.response ? error.response.data : error.message);
    // Return a structured error instead of throwing
    return {
      success: false,
      error: error.message,
      details: error.response?.data || {},
    };
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
async function createOutlookDraft(emailId, draftText, accessToken) {
  try {
    // Create a draft reply for the given email
    const createDraftResponse = await axios.post(`https://graph.microsoft.com/v1.0/me/messages/${emailId}/createReply`, null, { headers: { Authorization: `Bearer ${accessToken}` } });
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

async function forwardOutlookEmail(emailId, accessToken, toRecipients) {
  console.log("HIIII", toRecipients);
  if (!toRecipients || !Array.isArray(toRecipients) || toRecipients.length === 0) {
    throw new Error("Missing or invalid toRecipients array.");
  }
  try {
    const formattedRecipients = toRecipients.map((email) => ({ emailAddress: { address: email } }));
    console.log("FORMATTED RECIPEINTS", formattedRecipients);

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}/forward`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toRecipients: formattedRecipients,
        // Optional comment field
        comment: "Forwarding this email as requested.",
      }),
    });

    if (!response.ok) {
      // If the response isn't in the 2xx range, throw an error
      const errorData = await response.json();
      throw new Error(`Error forwarding email: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    console.log("Email forwarded successfully.");
    return await response.text(); // or response.json() if Graph returns JSON
  } catch (error) {
    console.error("Error forwarding email:", error.response ? error.response.data : error.message);
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

async function getOutlookCalendarEvents(accessToken) {
  try {
    // Set up date range (Today to end of the week)
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59);

    // Format dates for Microsoft Graph API
    const timeMin = now.toISOString();
    const timeMax = endOfWeek.toISOString();

    // Fetch Outlook Calendar events
    const response = await axios.get(`https://graph.microsoft.com/v1.0/me/calendar/events`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        startDateTime: timeMin,
        endDateTime: timeMax,
        $orderby: "start/dateTime",
        $top: 50, // Limit to 50 events
      },
    });

    // Process and format events
    const events = response.data.value.map((event) => ({
      id: event.id,
      title: event.subject || "No Title",
      startTime: event.start?.dateTime,
      endTime: event.end?.dateTime,
      location: event.location?.displayName || "No Location",
      organizer: event.organizer?.emailAddress?.name || "Unknown Organizer",
    }));

    console.log(events);

    return JSON.stringify(events, null, 2); // Pretty-print JSON
  } catch (error) {
    console.error("❌ Error fetching Outlook calendar events:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getOutlookCalendarEvents,
  createOutlookDraft,
  unsubscribeToOutlookEmails,
  archiveOutlookEmail,
  favoriteOutlookEmail,
  forwardOutlookEmail,
  subscribeToOutlookEmails,
  getEmailById,
  getAccessTokenFromRefreshTokenOutlook,
  getRefreshTokenOutlook,
  applyCategoryToOutlookEmail,
  storeLatestMessageId,
  getLatestMessageId,
};
