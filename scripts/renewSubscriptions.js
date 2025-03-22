const fs = require("fs");
const axios = require("axios");

const admin = require("../backend/api/firebase");

console.log("🔍 Checking Firebase Credentials:");
console.log("🔍 FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("🔍 FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("🔍 FIREBASE_PRIVATE_KEY is set:", process.env.FIREBASE_PRIVATE_KEY ? "✅ Yes" : "❌ No");
// // Ensure Firebase is not already initialized
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Escape newlines properly
//     }),
//   });
// }

const db = admin.firestore(); // ✅ Define Firestore database instance

const { getAccessTokenFromRefreshToken, watchGmailInbox, stopWatchGmailInbox } = require("../backend/utils/gmailService");

async function renewSubscriptions() {
  const logFile = "scripts/log.txt"; // Log file path
  try {
    console.log("🔄 Running function for Gmail subscription renewal...");

    const usersSnapshot = await db.collection("Users").get();
    const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    console.log("users", users);

    if (users.length === 0) {
      console.log("⚠️ No users found.");
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

        const accessToken = await getAccessTokenFromRefreshToken(user.refreshToken);

        const subscriptionsResponse = await axios.get("https://graph.microsoft.com/v1.0/subscriptions", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const subscriptions = subscriptionsResponse.data.value || [];

        if (user.listenerStatus === 1) {
          console.log(`🟡 No active subscription found for user ${user.id}. Creating a new one...`);
          await stopWatchGmailInbox(accessToken);
          await watchGmailInbox(accessToken);
          continue;
        } else if (user.listenerStatus === 0) {
          console.log(`🔕 Skipping subscription for user ${user.id}: Listener is disabled.`);
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError.response ? userError.response.data : userError.message);
      }
    }
  } catch (error) {
    console.error("❌ Error renewing Gmail subscriptions:", error.response ? error.response.data : error.message);
  }
}

renewSubscriptions();