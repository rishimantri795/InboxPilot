const express = require("express");
const router = express.Router();
const { retrieveFullEmail } = require("../utils/RAGService.js");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  const { userId, query } = req.body;

  if (!userId || !query) {
    return res.status(400).json({ error: "Missing userId or query" });
  }

  // Retrieve the full email based on the query
  const fullEmails = await retrieveFullEmail(userId, query);

  if (!fullEmails || fullEmails.length === 0) {
    return res.status(404).json({ error: "No relevant emails found." });
  }

  const prompt = `
      You are an AI assistant that helps users retrieve relevant information from their emails. 
      Your responses should be concise, relevant, and based only on the provided email context. Keep sent dates and email subjects in mind.
  
      Here are relevant emails based on the search query:
  
      ${fullEmails.map((email) => email.content).join("\n\n")}
  
      The user asks: "${query}"
  
      Based only on the given emails, answer the question as accurately as possible. 
      If the answer is unclear, state that the emails do not contain enough information.
    `;

  console.log("Prompt:", prompt);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that provides the user with details regarding their emails.",
        },
        { role: "user", content: prompt },
      ],
    });
    console.log(
      "Semantic Search Completion:",
      completion.choices[0].message.content
    );
    res.status(200).json({ completion: completion.choices[0].message.content });
  } catch (error) {
    console.error("Error in semantic search:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

module.exports = router;

module.exports = router;
