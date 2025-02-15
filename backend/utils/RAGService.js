const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Pinecone } = require("@pinecone-database/pinecone");
const natural = require("natural");
const pLimit = require("p-limit").default;
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

async function retrieveFullEmail(userId, query, topK = 7) {
  // Step 1: Convert query into embedding
  const queryEmbedding = await getRateLimitedEmbedding(query);

  // Step 2: Search for relevant email chunks using the embedding
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true, // We need metadata to identify emails
    filter: { user_id: userId }, // Only get emails for this user
  });

  // Step 3: Extract email IDs **in the same order as relevance ranking**
  const emailIdRelevanceMap = new Map(); // Map email_id -> highest match score

  results.matches.forEach((match) => {
    const emailId = match.metadata.email_id;
    if (!emailIdRelevanceMap.has(emailId)) {
      emailIdRelevanceMap.set(emailId, match.score); // Store highest relevance
    }
  });

  console.log("Email IDs (ordered by relevance):", [
    ...emailIdRelevanceMap.keys(),
  ]);

  let fullEmails = []; // Store emails in an ordered array

  // Step 4: Retrieve ALL chunks for each matched email_id in order of relevance
  for (const [emailId, score] of emailIdRelevanceMap.entries()) {
    const emailChunks = await index.query({
      vector: Array(1536).fill(0), // Dummy vector to retrieve all chunks
      topK: 100, // Assuming emails won't exceed 100 chunks
      includeMetadata: true,
      filter: { user_id: userId, email_id: emailId }, // Get all chunks for this email
    });

    // Step 5: Sort chunks based on chunk_id to maintain order
    const sortedChunks = emailChunks.matches.sort(
      (a, b) => a.metadata.chunk_id - b.metadata.chunk_id
    );

    if (sortedChunks.length === 0) {
      console.error("No chunks found for email:", emailId);
      continue;
    }

    // Step 6: Reconstruct full email from ordered chunks
    const fullEmail = sortedChunks
      .map((chunk) => chunk.metadata.content)
      .join("\n");

    // Push to ordered array, preserving the relevance ranking
    fullEmails.push({ emailId, score, content: fullEmail });
  }

  // Step 7: Sort emails by relevance score (in case retrieval order changed)
  fullEmails.sort((a, b) => b.score - a.score);

  return fullEmails;
}

module.exports = {
  saveEmailChunks,
  retrieveFullEmail,
};

//make sure you import all packages
//export the functions
