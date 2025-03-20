const axios = require("axios");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK (only once)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Import helper functions (replace with actual implementations)
const { getAccessTokenFromRefreshTokenOutlook, subscribeToOutlookEmails, unsubscribeToOutlookEmails } = require("../backend/utils/outlookService");
async function renewOutlookSubscriptions() {
  try {
    console.log("🔄 Running function for Outlook subscription renewal...");

    const usersSnapshot = await db.collection("Users").get();
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (users.length === 0) {
      console.log("⚠️ No users found.");
      return res.status(200).send("No users found.");
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
        console.log(`🔹 Processing user: ${user.id}`);

        const accessToken = await getAccessTokenFromRefreshTokenOutlook(user.refreshToken);

        const subscriptionsResponse = await axios.get("https://graph.microsoft.com/v1.0/subscriptions", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const subscriptions = subscriptionsResponse.data.value || [];

        if (user.listenerStatus === 1) {
          console.log(`🟡 No active subscription found for user ${user.id}. Creating a new one...`);
          await unsubscribeToOutlookEmails(accessToken);
          await subscribeToOutlookEmails(accessToken);
          continue;
        } else if (user.listenerStatus === 0) {
          console.log(`🔕 Skipping subscription for user ${user.id}: Listener is disabled.`);
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError.response ? userError.response.data : userError.message);
      }
    }

    res.status(200).send("Subscription renewal process completed.");
  } catch (error) {
    console.error("❌ Error renewing Outlook subscriptions:", error.response ? error.response.data : error.message);
    res.status(500).send("Error renewing subscriptions.");
  }
}

// Run the function
renewOutlookSubscriptions();
