const axios = require("axios");
const admin = require("../api/firebase"); // Firestore instance
const db = admin.firestore();

const { getAccessTokenFromRefreshTokenOutlook, subscribeToOutlookEmails } = require("./outlookService");

async function renewSubscriptions() {
  try {
    console.log("🔄 Starting Outlook subscription renewal process...");

    // Fetch all users from Firestore
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
        console.log(`🔹 Processing user: ${user.id}`);

        // Get the access token
        const accessToken = await getAccessTokenFromRefreshTokenOutlook(user.refreshToken);

        // Fetch the current subscriptions
        const subscriptionsResponse = await axios.get("https://graph.microsoft.com/v1.0/subscriptions", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const subscriptions = subscriptionsResponse.data.value || [];

        if (subscriptions.length === 0) {
          console.log(`🟡 No active subscription found for user ${user.id}. Creating a new one...`);
          await subscribeToOutlookEmails(accessToken);
          continue;
        }

        for (const subscription of subscriptions) {
          const expirationDate = new Date(subscription.expirationDateTime);
          const now = new Date();
          const timeLeft = (expirationDate - now) / (1000 * 60 * 60 * 24); // Convert ms to days

          if (timeLeft < 3) {
            console.log(`🔄 Subscription for user ${user.id} is expiring in ${timeLeft.toFixed(1)} days. Renewing...`);

            await axios.patch(
              `https://graph.microsoft.com/v1.0/subscriptions/${subscription.id}`,
              {
                expirationDateTime: new Date(Date.now() + 3600 * 1000 * 24 * 3).toISOString(), // Extend by 3 days
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`✅ Subscription renewed for user ${user.id}.`);
          } else {
            console.log(`🟢 Subscription for user ${user.id} is active. No renewal needed.`);
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError.response ? userError.response.data : userError.message);
      }
    }
  } catch (error) {
    console.error("❌ Error renewing Outlook subscriptions:", error.response ? error.response.data : error.message);
  }
}

// Run the function
renewSubscriptions();
