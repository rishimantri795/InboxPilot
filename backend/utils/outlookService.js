const axios = require("axios");

const admin = require("../api/firebase");
const db = admin.firestore();

console.log("IN OUTLOOK SERVICE: " + process.env.NOTIFICATION_URL);
async function subscribeToOutlookEmails(accessToken) {
  try {
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
    console.log("🔹 Subscription ID:", response.data.id);
    console.log("🔹 Expiration:", response.data.expirationDateTime);

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

    console.log("✅ New Access Token:", response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error getting new access token:", error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = { subscribeToOutlookEmails, getEmailById, getAccessTokenFromRefreshTokenOutlook, getRefreshTokenOutlook };
