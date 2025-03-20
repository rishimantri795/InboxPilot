const fs = require("fs");
const axios = require("axios");

async function renewOutlookSubscriptions() {
  const logFile = "scripts/log.txt"; // Log file path
  try {
    console.log("🔄 Running function for Outlook subscription renewal...");
    fs.appendFileSync(logFile, `\n🔄 Running function at ${new Date().toISOString()}`);

    // Mock user data (replace with actual database call)
    const users = [
      { id: "user1", refreshToken: "dummy_token", listenerStatus: 1 },
      { id: "user2", refreshToken: "dummy_token", listenerStatus: 0 },
    ];

    for (const user of users) {
      if (!user.refreshToken) {
        console.log(`⚠️ Skipping user ${user.id}: No refresh token found.`);
        fs.appendFileSync(logFile, `\n⚠️ Skipping user ${user.id}: No refresh token found.`);
        continue;
      }

      if (user.listenerStatus !== 1) {
        console.log(`🔕 Skipping user ${user.id}: Listener is disabled.`);
        fs.appendFileSync(logFile, `\n🔕 Skipping user ${user.id}: Listener is disabled.`);
        continue;
      }

      console.log(`✅ Processed user ${user.id}`);
      fs.appendFileSync(logFile, `\n✅ Processed user ${user.id} at ${new Date().toISOString()}`);
    }

    console.log("✅ Subscription renewal process completed.");
    fs.appendFileSync(logFile, "\n✅ Subscription renewal process completed.");
  } catch (error) {
    console.error("❌ Error renewing subscriptions:", error.message);
    fs.appendFileSync(logFile, `\n❌ Error renewing subscriptions: ${error.message}`);
  }
}

renewOutlookSubscriptions();
