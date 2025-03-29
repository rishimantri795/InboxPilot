const fs = require("fs");
const axios = require("axios");

const admin = require("./cronfirebase");
const db = admin.firestore();

const { watchGmailInbox, stopWatchGmailInbox } = require("../backend/utils/gmailService");
const { getAccessTokenFromRefreshToken } = require("../backend/utils/tokenService");
const { subscribeToOutlookEmails, unsubscribeToOutlookEmails, getAccessTokenFromRefreshTokenOutlook } = require("../backend/utils/outlookService");

async function renewSubscriptions() {
  try {
    console.log("🔄 Running subscription renewal for all users...");

    const usersSnapshot = await db.collection("Users").get();
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (users.length === 0) {
      console.log("⚠️ No users found.");
      return;
    }

    for (const user of users) {
      if (!user.refreshToken) {
        console.log(`⚠️ Skipping user ${user.id}: No refresh token found.`);
        continue;
      }

      if (user.listenerStatus !== 1) {
        console.log(`🔕 Skipping user ${user.id}: Listener is disabled.`);
        continue;
      }

      try {
        console.log(`🔹 Processing user: ${user.id} (${user.provider})`);

        if (user.provider === "outlook") {
          const accessToken = await getAccessTokenFromRefreshTokenOutlook(user.refreshToken);
          console.log(`🔁 Renewing Outlook subscription for ${user.id}...`);

          if (user.outlookSubscriptionId) {
            await unsubscribeToOutlookEmails(accessToken, user.outlookSubscriptionId);
          }

          const subscription = await subscribeToOutlookEmails(accessToken);
          if (subscription && subscription.id) {
            await db.collection("Users").doc(user.id).update({
              outlookSubscriptionId: subscription.id,
            });
            console.log(`✅ Outlook subscription updated for ${user.id}`);
          }
        } else {
          const accessToken = await getAccessTokenFromRefreshToken(user.refreshToken);
          console.log(`🔁 Renewing Gmail subscription for ${user.id}...`);

          await stopWatchGmailInbox(accessToken);
          await watchGmailInbox(accessToken);
          console.log(`✅ Gmail subscription updated for ${user.id}`);
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError.response ? userError.response.data : userError.message);
      }
    }
  } catch (error) {
    console.error("❌ Error renewing subscriptions:", error.response ? error.response.data : error.message);
  }
}

renewSubscriptions();
