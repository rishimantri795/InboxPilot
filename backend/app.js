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

const app = express();
const users = require("./routes/users");

const { fetchEmailHistory, getOrCreatePriorityLabel, applyLabelToEmail, fetchEmailHistoryWithRetry, fetchEmailHistoryAndApplyLabel, getMessageDetails, archiveEmail, forwardEmail, favoriteEmail, getOriginalEmailDetails, createDraft, getLatestHistoryId } = require("./utils/gmailService.js");
const { classifyEmail, createDraftEmail } = require("./utils/openai.js");

app.use(express.json());

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  session({
    secret: "your-secure-secret", // Use a strong, secure secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      sameSite: "lax", // Adjust based on your needs
    },
    name: "connect.sid", // Optional: customize the cookie name
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/users", users);

// Notification handling
app.post("/notifications", async (req, res) => {
  const message = req.body.message;

  if (message && message.data) {
    const buff = Buffer.from(message.data, "base64");
    const decodedMessage = JSON.parse(buff.toString("utf-8"));

    const emailAddress = decodedMessage.emailAddress;
    const newHistoryId = decodedMessage.historyId;

    console.log(`Received Pub/Sub Message for ${emailAddress}, historyId: ${newHistoryId}`);

    try {
      const userSnapshot = await db.collection("Users").where("email", "==", emailAddress).limit(1).get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();

        if (user.historyId && user.historyId === newHistoryId) {
          console.log("Duplicate notification received; ignoring this historyId.");
          return res.status(204).send();
        }

        if (user.refreshToken) {
          console.log(`User ${emailAddress} has a valid refreshToken, proceeding to check history.`);

          const accessToken = await getAccessTokenFromRefreshToken(user.refreshToken);

          if (accessToken && user.rules) {
            // Fetch the history to check if this was an inbox message
            const history = await fetchEmailHistory(accessToken, user.historyId || 1, newHistoryId);

            // Direct check of labelIds in the history array
            const hasInboxMessage = history.some((message) => message.labelIds && message.labelIds.includes("INBOX"));
            console.log("HEEEEEY!");
            console.log("HASINBOXMESSAGE" + hasInboxMessage);

            if (hasInboxMessage) {
              console.log(`Processing emails for ${emailAddress}`);

              const userMessages = await fetchEmailHistoryWithRetry(accessToken, user.historyId);

              if (userMessages.length === 0) {
                console.log("No new messages found after retries.");
                return res.status(204).send();
              }

              // Process each message directly
              for (const message of userMessages) {
                try {
                  console.log("Processing message:", message.id);
                  const emailContent = await getMessageDetails(accessToken, message.id);
                  console.log(emailContent);

                  const ruleKey = await classifyEmail(emailContent, user.rules, user.profile);
                  console.log("Rule key:", ruleKey);

                  if (ruleKey === "Null") {
                    console.error("email not valid to rule");
                    continue;
                  }

                  const rule = user.rules[parseInt(ruleKey)];
                  console.log("Rule:", rule);

                  for (const action of JSON.parse(rule.type)) {
                    console.log("Action config:", action.config);
                    console.log("Action:", action);

                    switch (action.type) {
                      case "label":
                        console.log("Applying label:", action.config.labelName);
                        const labelId = await getOrCreatePriorityLabel(accessToken, action.config.labelName);
                        await applyLabelToEmail(accessToken, message.id, labelId);
                        break;

                      case "archive":
                        console.log("Archiving email");
                        await archiveEmail(accessToken, message.id);
                        break;

                      case "forward":
                        console.log("Forwarding email to:", action.config.forwardTo);
                        await forwardEmail(accessToken, message.id, action.config.forwardTo);
                        break;

                      case "favorite":
                        console.log("Favoriting email");
                        await favoriteEmail(accessToken, message.id);
                        break;

                      case "draft":
                        const fromEmail = await getOriginalEmailDetails(accessToken, message.id);
                        console.log("fromEmail:", fromEmail);
                        const reply = await createDraftEmail(emailContent, action.config.draftTemplate);
                        await createDraft(accessToken, message.threadId, reply, message.id, fromEmail);
                        break;
                    }
                  }
                } catch (error) {
                  console.error(`Error processing message ${message.id}:`, error);
                  // Continue with next message even if current one fails
                  continue;
                }
              }

              console.log(`Processed emails for ${emailAddress}, HistoryId: ${newHistoryId}`);

              // Update the user's historyId in Firestore
              await userDoc.ref.update({ historyId: newHistoryId });
              console.log(`Updated historyId for ${emailAddress} to ${newHistoryId}`);
            } else {
              console.log(`No inbox message found in history for ${emailAddress}, skipping processing`);
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
