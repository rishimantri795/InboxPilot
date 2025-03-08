const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { enqueueOnboardingTask, disableRAG } = require("../utils/worker.js");
const { getAccessTokenFromRefreshToken } = require("../utils/tokenService.js");
const admin = require("../api/firebase.js"); // import the firebase admin object
const db = admin.firestore();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/enableRAG", async (req, res) => {
  const { userId, refreshToken } = req.body;

  try {
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    if (!accessToken) {
      return res.status(400).json({ error: "Access token not found" });
    }

    enqueueOnboardingTask(accessToken, userId);

    const userRef = db.collection("Users").doc(userId);

    await userRef.update({
      RAG: "enabled",
    });

    res.status(200).json({ message: "Onboarding task enqueued successfully" });
  } catch (error) {
    console.error("Error enqueuing onboarding task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/disableRAG", async (req, res) => {
  const { userId, refreshToken } = req.body;

  try {
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    if (!accessToken) {
      return res.status(400).json({ error: "Access token not found" });
    }

    const userRef = db.collection("Users").doc(userId);

    disableRAG(userId);

    await userRef.update({
      RAG: "disabled",
    });

    res.status(200).json({ message: "Onboarding task enqueued successfully" });
  } catch (error) {
    console.error("Error enqueuing onboarding task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/getEmailDetails", async (req, res) => {
  const { emailIds, refreshToken } = req.body;
});

// interface EmailMetadata {
//     id: string;
//     subject?: string;
//     sender?: string;
//     date?: string;
//     snippet?: string;
//     hasAttachments?: boolean;
//     labels?: string[];
//     threadId?: string;
//     receivedTime?: Date;
//   }
module.exports = router;
