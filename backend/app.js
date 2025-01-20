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

const { fetchEmailHistory, getOrCreatePriorityLabel, applyLabelToEmail, fetchEmailHistoryWithRetry, fetchEmailHistoryAndApplyLabel, getMessageDetails, archiveEmail, forwardEmail, favoriteEmail, getOriginalEmailDetails, createDraft, getLatestHistoryId, fetchLatestEmail } = require("./utils/gmailService.js");
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

app.post("/notifications", async (req, res) => {
  const message = req.body.message;

  if (message && message.data) {
    const buff = Buffer.from(message.data, "base64");
    const decodedMessage = JSON.parse(buff.toString("utf-8"));

    const emailAddress = decodedMessage.emailAddress;

    console.log(`Received Pub/Sub Message for ${emailAddress}`);

    try {
      const userSnapshot = await db.collection("Users").where("email", "==", emailAddress).limit(1).get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();

        if (user.refreshToken) {
          console.log(`User ${emailAddress} has a valid refreshToken, proceeding to fetch the latest message.`);

          const accessToken = await getAccessTokenFromRefreshToken(user.refreshToken);

          if (accessToken && user.rules) {
            // Fetch the latest email using the users.messages.list endpoint
            const latestMessageResponse = await fetchLatestEmail(accessToken);

            if (latestMessageResponse.messages && latestMessageResponse.messages.length > 0) {
              const latestMessage = latestMessageResponse.messages[0]; // Get the most recent message

              try {
                console.log("Processing latest message:", latestMessage.id);
                const emailContent = await getMessageDetails(accessToken, latestMessage.id);
                console.log(emailContent);

                const ruleKey = await classifyEmail(emailContent, user.rules, user.profile);
                console.log("Rule key:", ruleKey);

                if (ruleKey === "Null") {
                  console.error("Email not valid for rule");
                  return res.status(204).send(); // No valid rule match
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
                      await applyLabelToEmail(accessToken, latestMessage.id, labelId);
                      break;

                    case "archive":
                      console.log("Archiving email");
                      await archiveEmail(accessToken, latestMessage.id);
                      break;

                    case "forward":
                      console.log("Forwarding email to:", action.config.forwardTo);
                      await forwardEmail(accessToken, latestMessage.id, action.config.forwardTo);
                      break;

                    case "favorite":
                      console.log("Favoriting email");
                      await favoriteEmail(accessToken, latestMessage.id);
                      break;

                    case "draft":
                      const fromEmail = await getOriginalEmailDetails(accessToken, latestMessage.id);
                      console.log("fromEmail:", fromEmail);
                      const reply = await createDraftEmail(emailContent, action.config.draftTemplate);
                      await createDraft(accessToken, latestMessage.threadId, reply, latestMessage.id, fromEmail);
                      break;
                  }
                }
              } catch (error) {
                console.error(`Error processing latest message ${latestMessage.id}:`, error);
              }

              console.log(`Processed latest email for ${emailAddress}`);

              // No need to update historyId in this case
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
