const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const { getAccessTokenFromRefreshToken } = require("../utils/tokenService.js");

// Helper function to parse email metadata from Gmail message
const parseEmailMetadata = (message) => {
  const headers = message.payload.headers;
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader("subject") || "No Subject",
    sender: getHeader("from") || "Unknown Sender",
    snippet: message.snippet || "",
    receivedTime: new Date(parseInt(message.internalDate)),
    hasAttachments:
      message.payload.parts?.some(
        (part) => part.filename && part.filename.length > 0
      ) || false,
    labels: message.labelIds || [],
  };
};

// POST /api/emails/details
router.post("/details", async (req, res) => {
  try {
    const { emailIds, refreshToken } = req.body;

    if (!Array.isArray(emailIds) || !refreshToken) {
      console.error("Invalid request:", {
        emailIdsIsArray: Array.isArray(emailIds),
        hasRefreshToken: !!refreshToken,
      });
      return res.status(400).json({
        error:
          "Invalid request. emailIds must be an array and refreshToken is required.",
        details: {
          emailIdsProvided: emailIds
            ? Array.isArray(emailIds)
              ? emailIds.length
              : typeof emailIds
            : "none",
          refreshTokenProvided: refreshToken ? "yes" : "no",
        },
      });
    }

    console.log(`Attempting to fetch details for ${emailIds.length} emails`);

    // Get access token from refresh token
    let accessToken;
    try {
      accessToken = await getAccessTokenFromRefreshToken(refreshToken);
      console.log("Successfully obtained access token");
    } catch (tokenError) {
      console.error("Token refresh error:", tokenError);
      return res.status(401).json({
        error: "Failed to authenticate with Gmail",
        details: tokenError.message,
      });
    }

    // Create OAuth2 client and set credentials
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Initialize Gmail API with the OAuth2 client
    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    // Fetch details for each email ID
    const emailPromises = emailIds.map(async (emailId) => {
      try {
        console.log(`Fetching email: ${emailId}`);
        const response = await gmail.users.messages.get({
          userId: "me",
          id: emailId,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const metadata = parseEmailMetadata(response.data);
        console.log(
          `Successfully fetched email ${emailId}: ${metadata.subject}`
        );
        console.log(metadata.threadId);
        return metadata;
      } catch (error) {
        console.error(`Error fetching email ${emailId}:`, error.message);
        return {
          id: emailId,
          subject: "Email Not Found",
          sender: "Unknown",
          snippet: `This email could not be retrieved: ${error.message}`,
          receivedTime: new Date(),
          hasAttachments: false,
          labels: [],
          threadId: emailId,
        };
      }
    });

    // Wait for all email fetches to complete
    const emailDetails = await Promise.all(emailPromises);

    // Convert array to object with email IDs as keys
    const emailsObject = emailDetails.reduce((acc, email) => {
      acc[email.id] = email;
      return acc;
    }, {});

    console.log(
      `Returning details for ${Object.keys(emailsObject).length} emails`
    );
    res.json({ emails: emailsObject });
  } catch (error) {
    console.error("Error in /api/emails/details:", error);
    res.status(500).json({
      error: "Failed to fetch email details",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;
