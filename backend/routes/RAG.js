const express = require("express");
const router = express.Router();
const { retrieveFullEmail } = require("../utils/RAGService.js");
const OpenAI = require("openai");
const { enqueueOnboardingTask } = require("../utils/worker.js");
const { getAccessTokenFromRefreshToken } = require("../utils/tokenService.js");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  const { userId, refreshToken } = req.body;

  try {
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    if (!accessToken) {
      return res.status(400).json({ error: "Access token not found" });
    }

    enqueueOnboardingTask(accessToken, userId);

    res.status(200).json({ message: "Onboarding task enqueued successfully" });
  } catch (error) {
    console.error("Error enqueuing onboarding task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
