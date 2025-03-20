const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Pinecone } = require("@pinecone-database/pinecone");
const natural = require("natural");
// const pLimit = require("p-limit").default;
const pLimit = require("p-limit");
require("dotenv").config();

const app = express();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const pc = new Pinecone({
  apiKey: process.env.PINECONE_APIKEY,
});

const indexName = "quickstart";

const index = pc.index(indexName);
const limit = pLimit(5);

function chunkEmail(emailText, chunkSize = 512, overlap = 100) {
  if (emailText.length == undefined) {
    return [];
  }
  const sentenceTokenizer = new natural.SentenceTokenizer();

  let paragraphs = emailText.split(/\n\s*\n/); // Split by paragraph (double newlines)
  let chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (let paragraph of paragraphs) {
    let sentences = sentenceTokenizer.tokenize(paragraph);
    let paragraphLength = paragraph.split(" ").length;

    if (paragraphLength <= chunkSize) {
      // If paragraph fits, store it as a chunk
      chunks.push(paragraph);
      continue;
    }

    // If paragraph is too long, split it into sentence-based chunks
    for (let sentence of sentences) {
      let sentenceLength = sentence.split(" ").length;

      if (currentLength + sentenceLength > chunkSize) {
        chunks.push(currentChunk.join(" ")); // Store chunk
        currentChunk = currentChunk.slice(-(overlap / 10)); // Keep overlap
        currentLength = currentChunk.reduce(
          (sum, s) => sum + s.split(" ").length,
          0
        );
      }

      currentChunk.push(sentence);
      currentLength += sentenceLength;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" ")); // Add final chunk
      currentChunk = [];
      currentLength = 0;
    }
  }
  console.log("Chunks count:", chunks.length);

  return chunks;
}

const getEmbedding = async (text) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        input: text,
        model: "text-embedding-ada-002",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error("OpenAI API Error:", error.response?.data || error.message);
    throw error;
  }
};

const getRateLimitedEmbedding = (text) => {
  return limit(() => getEmbedding(text)); // Enqueue request to be rate-limited
};

async function enforceMaxEmails(userId) {
  const index = pc.index("quickstart");

  // Count emails for the user
  const userEmails = await index.query({
    filter: { user_id: userId }, // Ensure correct filter key
    topK: 500, // Max allowed
  });

  if (userEmails.matches.length >= 500) {
    // Sort emails by timestamp (oldest first)
    const oldestEmailId = userEmails.matches.sort(
      (a, b) => a.metadata.timestamp - b.metadata.timestamp
    )[0].metadata.email_id; // Ensure we get email_id

    if (oldestEmailId) {
      // Delete all chunks of the oldest email by its email_id
      await index.delete({
        ids: [oldestEmailId], // Pass the email ID explicitly here
      });
      console.log(`Deleted oldest email ${oldestEmailId} for user ${userId}`);
    } else {
      console.error("Oldest email ID not found.");
    }
  }
}

async function saveEmailChunks(userId, emailId, emailText) {
  console.log("Saving email chunks...");
  // await enforceMaxEmails(userId); // Ensure email limit is enforced to be worked on
  const chunks = chunkEmail(emailText, 512, 100);
  console.log("Chunks generated:", chunks.length);

  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getRateLimitedEmbedding(chunks[i]);

    if (!Array.isArray(embedding)) {
      console.error("Embedding is not an array:", embedding);
      return; // Stop execution if embeddings are incorrect
    }

    vectors.push({
      id: `${userId}_${emailId}_chunk${i}`,
      values: embedding,
      metadata: {
        user_id: userId,
        email_id: emailId,
        chunk_id: i,
        content: chunks[i],
      },
    });
  }

  if (!Array.isArray(vectors) || vectors.length === 0) {
    console.error("No valid vectors to upsert");
    return;
  }
  try {
    await index.upsert(vectors);
    delay(200);
  } catch (error) {
    console.error("Error saving email chunks:", error);
    throw error;
  }
}

async function retrieveFullEmail(
  userId,
  query,
  similarityThreshold = 0.8,
  maxEmails = 30
) {
  // Step 1: Convert query into embedding
  const queryEmbedding = await getRateLimitedEmbedding(query);

  // Step 2: Retrieve a large number of potential matches
  const results = await index.query({
    vector: queryEmbedding,
    topK: 1000, // High value to retrieve as many matches as possible
    includeMetadata: true,
    filter: { user_id: userId }, // Only get emails for this user
  });

  // Step 3: Filter out emails below the similarity threshold
  let emailIdRelevanceMap = new Map();
  results.matches.forEach((match) => {
    if (match.score >= similarityThreshold) {
      const emailId = match.metadata.email_id;
      if (!emailIdRelevanceMap.has(emailId)) {
        emailIdRelevanceMap.set(emailId, match.score);
      }
    }
  });

  console.log("Email IDs (above threshold):", [...emailIdRelevanceMap.keys()]);

  // Step 4: Sort email IDs by highest relevance score & enforce the 30-email limit
  const sortedEmails = [...emailIdRelevanceMap.entries()]
    .sort((a, b) => b[1] - a[1]) // Sort by score (descending)
    .slice(0, maxEmails); // Keep only the top 30

  let fullEmails = [];

  // Step 5: Retrieve chunks for each email, up to the 30-email limit
  for (const [emailId, score] of sortedEmails) {
    const emailChunks = await index.query({
      vector: Array(1536).fill(0), // Dummy vector to retrieve all chunks
      topK: 100,
      includeMetadata: true,
      filter: { user_id: userId, email_id: emailId },
    });

    // Sort chunks by chunk_id
    const sortedChunks = emailChunks.matches.sort(
      (a, b) => a.metadata.chunk_id - b.metadata.chunk_id
    );

    if (sortedChunks.length === 0) {
      console.error("No chunks found for email:", emailId);
      continue;
    }

    // Reconstruct full email
    const fullEmail = sortedChunks
      .map((chunk) => chunk.metadata.content)
      .join("\n");

    fullEmails.push({ emailId, score, content: fullEmail });

    // Stop early if we hit the limit (redundant but safe)
    if (fullEmails.length >= maxEmails) break;
  }

  return fullEmails;
}

module.exports = {
  saveEmailChunks,
  retrieveFullEmail,
};

//make sure you import all packages
//export the functions
