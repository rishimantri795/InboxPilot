const Bull = require("bull");
require("dotenv").config();

const taskQueue = new Bull("task-queue", {
  redis: {
    host: process.env.HOST,
    port: 15237,
    password: process.env.REDISPASS,
  },
});

async function enqueueOnboardingTask(accessToken, userId) {
  await taskQueue.add(
    "onboarding",
    { accessToken: accessToken, userId: userId },
    { attempts: 3, backoff: 5000 }
  );
  console.log(`Onboarding task enqueued for user ${userId}`);
}

async function enqueueEmbeddingTask(userId, emailId, emailContent) {
  await taskQueue.add(
    "embedding",
    { userId: userId, emailId: emailId, emailContent: emailContent },
    { attempts: 3, backoff: 5000 }
  );
  console.log(`Embedding task enqueued for user ${userId}`);
}

module.exports = {
  taskQueue,
  enqueueOnboardingTask,
  enqueueEmbeddingTask,
};
