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

  const currentDate = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

  const prompt = `
  You are an AI assistant that helps users retrieve relevant information from their emails. 
  Your responses should be **concise, relevant, and strictly based on the provided email context.** 

  **Date Understanding:**
  - **Today's date is: ${currentDate}**.  
  - If an email references a relative time (e.g., "tomorrow," "next week," or "yesterday"), interpret it based on the email's **sent date** rather than today's date.  
  - Convert relative date references into absolute dates when answering user questions.  

  **Relevant Emails Based on the Search Query:**  

  ${fullEmails
    .map((email) => `Date: ${email.date}\nContent: ${email.content}`)
    .join("\n\n")}

  **User's Query:** "${query}"  

  **Instructions:**  
  - Use the email dates to correctly interpret relative time references.  
  - If the answer is unclear, state that the emails do not contain enough information.  
  - Do **not** make up details that are not explicitly mentioned in the emails.  

  Based **only** on the given emails and the provided context, answer the question as accurately as possible.
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
