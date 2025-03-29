const express = require("express");
const path = require("path");
const admin = require("./api/firebase.js");
const db = admin.firestore();
const { getAccessTokenFromRefreshToken } = require("./utils/tokenService.js");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
require("dotenv").config();
require("./middleware/passport.js");
const axios = require("axios");
const { htmlToText } = require("html-to-text");

// const axios = require("axios");

const AWS = require("aws-sdk");

const RAG = require("./routes/RAG.js");
const chat = require("./routes/chat");
const pdf = require("pdf-parse");
const { enqueueOnboardingTask, enqueueEmbeddingTask } = require("./utils/worker.js");
const app = express();
const users = require("./routes/users");
const emails = require("./routes/emails");

const { archiveOutlookEmail, favoriteOutlookEmail, forwardOutlookEmail, createOutlookDraft, fetchOutlookEmails, subscribeToOutlookEmails, getAccessTokenFromRefreshTokenOutlook, getRefreshTokenOutlook, applyCategoryToOutlookEmail, storeLatestMessageId, getLatestMessageId } = require("./utils/outlookService.js");

const { fetchEmailHistory, getOrCreatePriorityLabel, applyLabelToEmail, fetchEmailHistoryWithRetry, fetchEmailHistoryAndApplyLabel, getMessageDetails, archiveEmail, forwardEmail, favoriteEmail, getOriginalEmailDetails, createDraft, getLatestHistoryId, fetchLatestEmail } = require("./utils/gmailService.js");
const { classifyEmail, createDraftEmail } = require("./utils/openai.js");

app.set("trust proxy", 1); // Trust first proxy

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://theinboxpilot.com",
  "http://localhost:5173",
  "https://www.theinboxpilot.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // console.log("CORS request origin:", origin); // Debugging
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        console.error(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Required for cookies to work across domains
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  session({
    secret: "your-secure-secret", // Use a strong, secure secret in production
    resave: false,
    saveUninitialized: false,
    //try mongo db session instead of memory store
    cookie: {
      httpOnly: true,
      secure: process.env.DEV_TARGET_EMAILS !== "true", // Secure cookies for production (HTTPS)
      sameSite: process.env.DEV_TARGET_EMAILS === "true" ? "lax" : "None", // Cross-origin cookies for production
      domain: process.env.DEV_TARGET_EMAILS === "true" ? "localhost" : ".theinboxpilot.com", // Domain based on environment
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    },
    name: "connect.sid", // Optional: customize the cookie name
  })
);

// Initialize passport

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/users", users);
app.use("/api/emails", emails);
app.use("/api/onboardingRAG", RAG);

app.get("/outlook/webhook", (req, res) => {
  console.log("🔹 Microsoft Graph validation request received");

  // Microsoft sends a "validationToken" query parameter during subscription
  if (req.query.validationToken) {
    console.log("Received validation request");
    console.log("Validating webhook: " + req.query.validationToken);

    // IMPORTANT: Set the content type to text/plain
    res.set("Content-Type", "text/plain");
    // Return the validation token as plain text
    return res.status(200).send(req.query.validationToken);
  }

  res.status(400).send("Missing validation token");
});

app.post("/outlook/webhook", async (req, res) => {
  if (req.query && req.query.validationToken) {
    console.log("🔹 Responding to validation request...");
    return res.status(200).send(req.query.validationToken);
  }

  console.log("📩 Received email notification");

  try {
    const notification = req.body.value && req.body.value[0];
    if (!notification || !notification.resourceData || !notification.resourceData.id) {
      console.error("❌ No message ID found in webhook notification.");
      return res.status(400).send("Invalid webhook notification.");
    }

    const messageId = notification.resourceData.id;
    console.log(`📧 New Email Received! Fetching content for Message ID: ${messageId}`);

    const resourceParts = notification.resource.split("/");
    const userId = resourceParts.length > 1 ? resourceParts[1] : null;

    if (!userId) {
      console.error("❌ User ID not found in resource.");
      return res.status(400).send("User ID missing.");
    }

    const lastProcessedMessageId = await getLatestMessageId(userId);
    if (lastProcessedMessageId === messageId) {
      console.log("🚫 Duplicate email detected, skipping processing.");
      return res.status(202).send();
    }
    await storeLatestMessageId(userId, messageId);

    console.log("USER ID:", userId);

    const refreshToken = await getRefreshTokenOutlook(userId);
    const accessToken = await getAccessTokenFromRefreshTokenOutlook(refreshToken);

    async function getEmailById(messageId, accessToken) {
      try {
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          // Convert error response to JSON or text for better error details
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to fetch email. Status: ${response.status}. Details: ${JSON.stringify(errorData)}`);
        }

        // Parse the response as JSON
        const emailData = await response.json();
        return emailData;
      } catch (error) {
        console.error("Error fetching email details:", error.message);
        throw error;
      }
    }

    const emailResponse = await getEmailById(messageId, accessToken);

    const emailContent = htmlToText(emailResponse.body.content);
    const emailSubject = emailResponse.subject || "";
    //
    const userDoc = await db.collection("Users").doc(userId).get();
    if (!userDoc.exists) {
      console.error("❌ User not found.");
      return res.status(404).send("User not found.");
    }

    const userData = userDoc.data();
    const rules = userData.rules || {};

    const ruleKey = await classifyEmail(emailContent, rules);
    if (ruleKey === "Null") {
      console.log("No matching rule found, skipping.");
      return res.status(204).send();
    } else {
      console.log("HIGH PRIORITY");
    }

    const rule = rules[parseInt(ruleKey)];

    for (const action of rule.type) {
      switch (action.type) {
        case "label":
          await applyCategoryToOutlookEmail(messageId, accessToken, action.config.labelName);
          break;
        case "archive":
          await archiveOutlookEmail(messageId, accessToken);
          break;
        case "favorite":
          await favoriteOutlookEmail(messageId, accessToken);

          break;
        case "draft":
          async function fetchFileFromS3(s3Key) {
            const params = {
              Bucket: "inboxpilotbucket",
              Key: s3Key,
            };
            const data = await s3.getObject(params).promise();
            return data.Body; // This is a Buffer
          }

          const parsedFiles = await Promise.all(
            action.config.contextFiles.map(async (file) => {
              try {
                // Use AWS SDK to get the file buffer
                const buffer = await fetchFileFromS3(file.s3Key);
                const data = await pdf(buffer);
                return {
                  ...file,
                  fileName: file.fileName,
                  extractedText: data.text,
                };
              } catch (error) {
                console.error(`Error processing file ${file.fileName}:`, error);
                throw error;
              }
            })
          );
          const calendarEvents = action.config.calendarEvents;
          // const calendarEvents = false;
          console.log("Creating draft");
          const provider = "outlook";
          console.log("SUPPPP", emailContent);
          const emailTime = emailResponse.receivedDateTime || new Date().toISOString();
          console.log("Email Received Time:", emailTime);

          const reply = await createDraftEmail(emailContent, action.config.draftTemplate, parsedFiles, calendarEvents, accessToken, provider, emailTime);
          console.log("Sending draft");
          await createOutlookDraft(messageId, reply, accessToken);
          break;
        // case "forward":
        //   console.log("📩 Forwarding email - Recipients:", action.config.forwardTo);
        case "forward":
          // Check if email is already forwarded to prevent infinite loop.
          if (emailSubject.trim().toLowerCase().startsWith("fw:") || emailSubject.trim().toLowerCase().startsWith("fwd:")) {
            console.log("Email already forwarded, skipping forward action.");
            break;
          }

          console.log("📩 Forwarding email - Recipients:", action.config.forwardTo);
          let recipients = action.config.forwardTo;
          console.log("RECIPIENTSSS", recipients);
          if (!Array.isArray(recipients)) {
            recipients = [recipients]; // Convert to array if it's a single string
          }

          console.log("RECIPIENTSS AFTER:", recipients);
          console.log("MESSAGE ID:", messageId);

          if (recipients.length > 0) {
            await forwardOutlookEmail(messageId, accessToken, recipients);
            return res.status(202).send();
          } else {
            console.error("❌ Error: Missing or invalid toRecipients array.");
          }
          break;
      }
    }

    return res.status(202).send("Accepted");
  } catch (error) {
    console.error("❌ Error processing webhook:", error.response ? error.response.data : error.message);
    res.status(500).send("Error processing webhook");
  }
});

app.post("/notifications", async (req, res) => {
  const message = req.body.message;

  if (message) {
    // Decode message data if it exists
    let decodedMessage = {};
    if (message.data) {
      const buff = Buffer.from(message.data, "base64");
      decodedMessage = JSON.parse(buff.toString("utf-8"));
    }

    // Log message attributes
    const attributes = message.attributes || {};
    console.log("Received message attributes:", attributes);
    console.log("Decoded message:", decodedMessage);

    const emailAddress = attributes.email || decodedMessage.emailAddress;
    if (!emailAddress) {
      console.error("No email address found in attributes or message data.");
      return res.status(400).send("Invalid message: missing email address");
    }

    console.log(`Processing Pub/Sub notification for ${emailAddress}`);

    try {
      const userSnapshot = await db.collection("Users").where("email", "==", emailAddress).limit(1).get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();
        const userRef = userDoc.ref;

        if (user.refreshToken) {
          console.log(`User ${emailAddress} has a valid refreshToken, proceeding to fetch the latest message.`);

          const accessToken = await getAccessTokenFromRefreshToken(user.refreshToken);

          if (accessToken && user.rules) {
            // Fetch the latest email
            const latestMessageResponse = await fetchLatestEmail(accessToken);
            if (latestMessageResponse.messages && latestMessageResponse.messages.length > 0) {
              const latestMessage = latestMessageResponse.messages[0];
              console.log("Processing latest message:", latestMessage.id);

              // Check if the message was already processed
              if (user.latestProcessedMessageId === latestMessage.id) {
                console.log(`Email ${latestMessage.id} already processed. Skipping.`);
                return res.status(204).send();
              }

              await userRef.update({
                latestProcessedMessageId: latestMessage.id,
              });

              console.log(`stored latestProcessedMessageId: ${latestMessage.id} for ${emailAddress}`);

              // Process the email
              const emailContent = await getMessageDetails(accessToken, latestMessage.id);
              console.log(emailContent);

              // if (user.RAG == "enabled") {
              //   console.log("RAG STARTED --------------------------------------------");

              //   await enqueueEmbeddingTask(user.id, latestMessage.id, emailContent);

              //   console.log("RAG ENDED ----------------------------------------------");
              // }

              const ruleKey = await classifyEmail(emailContent, user.rules, user.profile);
              console.log("Rule key:", ruleKey);

              if (ruleKey === "Null") {
                console.error("Email not valid for rule");
                return res.status(204).send(); // No valid rule match
              }

              //rule key could be "Null" or "0" or "0,1" etc
              const ruleKeys = ruleKey.split(",");
              console.log("Rule keys:", ruleKeys);
              for (const key of ruleKeys) {
                const rule = user.rules[parseInt(key)];
                console.log("Rule:", rule);

                for (const action of rule.type) {
                  switch (action.type) {
                    case "label":
                      const labelId = await getOrCreatePriorityLabel(accessToken, action.config.labelName);
                      await applyLabelToEmail(accessToken, latestMessage.id, labelId);
                      break;
                    case "archive":
                      await archiveEmail(accessToken, latestMessage.id);
                      break;
                    case "forward":
                      await forwardEmail(accessToken, latestMessage.id, action.config.forwardTo);
                      break;
                    case "favorite":
                      await favoriteEmail(accessToken, latestMessage.id);
                      break;
                    case "draft":
                      const fromEmail = await getOriginalEmailDetails(accessToken, latestMessage.id);

                      async function fetchFileFromS3(s3Key) {
                        const params = {
                          Bucket: "inboxpilotbucket",
                          Key: s3Key,
                        };
                        const data = await s3.getObject(params).promise();
                        return data.Body; // This is a Buffer
                      }

                      const parsedFiles = await Promise.all(
                        action.config.contextFiles.map(async (file) => {
                          try {
                            // Use AWS SDK to get the file buffer
                            const buffer = await fetchFileFromS3(file.s3Key);
                            const data = await pdf(buffer);
                            return {
                              ...file,
                              fileName: file.fileName,
                              extractedText: data.text,
                            };
                          } catch (error) {
                            console.error(`Error processing file ${file.fileName}:`, error);
                            throw error;
                          }
                        })
                      );
                      const calendarEvents = action.config.calendarEvents;
                      const reply = await createDraftEmail(emailContent, action.config.draftTemplate, parsedFiles, calendarEvents, user.profile, accessToken);
                      await createDraft(accessToken, latestMessage.threadId, reply, latestMessage.id, fromEmail);
                      break;
                  }
                }
              }

              // Store the latest processed messageId

              console.log(`Processed latest email ID ${latestMessage.id} for ${emailAddress}`);
            } else {
              console.log(`No messages found for ${emailAddress}`);
            }
          } else {
            console.log(`Processing skipped due to missing accessToken or rules for email: ${emailAddress}`);
          }
        } else {
          console.log(`User ${emailAddress} does not have a valid refreshToken.`);
        }
      } else {
        console.log(`User with email ${emailAddress} not found in Firestore.`);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error handling Pub/Sub notification:", error);
      res.status(500).send("Error handling notification");
    }
  } else {
    res.status(400).send("Invalid message");
  }
});

app.get("/", (req, res) => {
  console.log("Hello World");
  res.send("Hello World!");
});

app.get("/getCookie", (req, res) => {
  res.cookie("exampleCookie", "cookieValue", {
    httpOnly: true,
    secure: true, // Ensure cookies are sent over HTTPS
    sameSite: "None", // Allows cross-site cookies
    domain: ".theinboxpilot.com", // Main domain
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
  res.send("Cookie has been set!");
});

app.use("/api/chat", chat);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Serve static files if needed
app.use(express.static(path.join(__dirname, "public")));

// Start the server
const port = process.env.PORT || 3010;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
