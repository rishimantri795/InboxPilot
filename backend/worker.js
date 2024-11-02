const Bull = require("bull");
const admin = require("./api/firebase.js");
const { getAccessTokenFromRefreshToken } = require("./utils/tokenService.js");
const { fetchEmailHistory } = require("./utils/gmailService.js");

// Bull queue configuration
const taskQueue = new Bull("task-queue", {
  redis: {
    host: "redis-18153.c253.us-central1-1.gce.redns.redis-cloud.com", // Replace with your Redis host
    port: 18153, // Replace with your Redis port
    password: "ZU5w3CNLaWm6mOzVNaG118gZf3jiVObQ", // Replace with your Redis password
  },
});

// Process the Bull queue
taskQueue.process(async (job) => {
  const { email, historyId } = job.data;

  try {
    // Fetch the user's Firestore document using the email
    const db = admin.firestore();
    const userSnapshot = await db
      .collection("Users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      const user = userDoc.data();

      // Fetch access token using the refresh token
      const accessToken = await getAccessTokenFromRefreshToken(
        user.refreshToken
      );

      // Fetch the latest email history from Gmail
      await fetchEmailHistory(accessToken, historyId);

      console.log(
        `Processed task for email: ${email}, historyId: ${historyId}`
      );
    } else {
      console.log(`User with email ${email} not found in Firestore.`);
    }
  } catch (error) {
    console.error("Error processing job:", error);
    throw error; // Rethrow error to allow Bull to handle retries
  }
});

// Error handling for failed jobs
taskQueue.on("failed", (job, err) => {
  console.error(
    `Job failed for email: ${job.data.email}, historyId: ${job.data.historyId}. Error: ${err.message}`
  );
});

// Log when a job is completed
taskQueue.on("completed", (job) => {
  console.log(
    `Job completed for email: ${job.data.email}, historyId: ${job.data.historyId}`
  );
});
