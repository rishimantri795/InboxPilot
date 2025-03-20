const axios = require("axios");

async function renewOutlookSubscriptions() {
  try {
    console.log("🔄 Running function for Outlook subscription renewal...");

    // Mock: Replace with actual database calls if needed
    const users = [
      { id: "user1", refreshToken: "dummy_token", listenerStatus: 1 },
      { id: "user2", refreshToken: "dummy_token", listenerStatus: 0 },
    ];

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

        // Replace with actual API request for access token
        const accessToken = "mock_access_token";

        // Mock API call (replace with actual Microsoft Graph API request)
        console.log(`✅ Renewed subscription for user ${user.id}`);
      } catch (error) {
        console.error(`❌ Error processing user ${user.id}:`, error.message);
      }
    }

    console.log("✅ Subscription renewal process completed.");
  } catch (error) {
    console.error("❌ Error renewing subscriptions:", error.message);
  }
}

// Run the function
renewOutlookSubscriptions();
