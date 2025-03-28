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
const RAG = require("./routes/RAG.js");
const chat = require("./routes/chat");
const pdf = require("pdf-parse");
const AWS = require("aws-sdk");
const {
  enqueueOnboardingTask,
  enqueueEmbeddingTask,
} = require("./utils/worker.js");
const app = express();
const users = require("./routes/users");
const emails = require("./routes/emails");

const {
  fetchEmailHistory,
  getOrCreatePriorityLabel,
  applyLabelToEmail,
  fetchEmailHistoryWithRetry,
  fetchEmailHistoryAndApplyLabel,
  getMessageDetails,
  archiveEmail,
  forwardEmail,
  favoriteEmail,
  getOriginalEmailDetails,
  createDraft,
  getLatestHistoryId,
  fetchLatestEmail,
} = require("./utils/gmailService.js");
const { classifyEmail, createDraftEmail } = require("./utils/openai.js");

app.set("trust proxy", 1); // Trust first proxy

app.use(express.json());

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
    credentials: true, // Required for cookies
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
      domain:
        process.env.DEV_TARGET_EMAILS === "true"
          ? "localhost"
          : ".theinboxpilot.com", // Domain based on environment
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
      const userSnapshot = await db
        .collection("Users")
        .where("email", "==", emailAddress)
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();
        const userRef = userDoc.ref;

        if (user.refreshToken) {
          console.log(
            `User ${emailAddress} has a valid refreshToken, proceeding to fetch the latest message.`
          );

          const accessToken = await getAccessTokenFromRefreshToken(
            user.refreshToken
          );

          if (accessToken && user.rules) {
            // Fetch the latest email
            const latestMessageResponse = await fetchLatestEmail(accessToken);
            if (
              latestMessageResponse.messages &&
              latestMessageResponse.messages.length > 0
            ) {
              const latestMessage = latestMessageResponse.messages[0];
              console.log("Processing latest message:", latestMessage.id);

              // Check if the message was already processed
              if (user.latestProcessedMessageId === latestMessage.id) {
                console.log(
                  `Email ${latestMessage.id} already processed. Skipping.`
                );
                return res.status(204).send();
              }

              await userRef.update({
                latestProcessedMessageId: latestMessage.id,
              });

              console.log(
                `stored latestProcessedMessageId: ${latestMessage.id} for ${emailAddress}`
              );

              // Process the email
              const emailContent = await getMessageDetails(
                accessToken,
                latestMessage.id
              );
              console.log(emailContent);

              if (user.RAG == "enabled") {
                console.log(
                  "RAG STARTED --------------------------------------------"
                );

                await enqueueEmbeddingTask(
                  user.id,
                  latestMessage.id,
                  emailContent
                );

                console.log(
                  "RAG ENDED ----------------------------------------------"
                );
              }

              const ruleKey = await classifyEmail(
                emailContent,
                user.rules,
                user.profile
              );
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
                      const labelId = await getOrCreatePriorityLabel(
                        accessToken,
                        action.config.labelName
                      );
                      await applyLabelToEmail(
                        accessToken,
                        latestMessage.id,
                        labelId
                      );
                      break;
                    case "archive":
                      await archiveEmail(accessToken, latestMessage.id);
                      break;
                    case "forward":
                      await forwardEmail(
                        accessToken,
                        latestMessage.id,
                        action.config.forwardTo
                      );
                      break;
                    case "favorite":
                      await favoriteEmail(accessToken, latestMessage.id);
                      break;
                    case "draft":
                      const fromEmail = await getOriginalEmailDetails(
                        accessToken,
                        latestMessage.id
                      );

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
                            console.error(
                              `Error processing file ${file.fileName}:`,
                              error
                            );
                            throw error;
                          }
                        })
                      );
                      const calendarEvents = action.config.calendarEvents;
                      const reply = await createDraftEmail(
                        emailContent,
                        action.config.draftTemplate,
                        parsedFiles,
                        calendarEvents,
                        user.profile,
                        accessToken
                      );
                      await createDraft(
                        accessToken,
                        latestMessage.threadId,
                        reply,
                        latestMessage.id,
                        fromEmail
                      );
                      break;
                  }
                }
              }

              // Store the latest processed messageId

              console.log(
                `Processed latest email ID ${latestMessage.id} for ${emailAddress}`
              );
            } else {
              console.log(`No messages found for ${emailAddress}`);
            }
          } else {
            console.log(
              `Processing skipped due to missing accessToken or rules for email: ${emailAddress}`
            );
          }
        } else {
          console.log(
            `User ${emailAddress} does not have a valid refreshToken.`
          );
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
