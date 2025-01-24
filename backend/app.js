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

app.use(express.json());

const corsOptions = {
  origin: `${process.env.FRONTEND_URL}`,
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

    // Optional: Filter based on attributes (e.g., email)
    if (process.env.DEV_TARGET_EMAILS == "true") {
      const targetEmails = [
        "aryangoel574@gmail.com",
        "munot.saakshi@gmail.com",
        "sohaibq914@gmail.com",
        "rishimantri795@gmail.com",
        "inboxpilots@gmail.com",
      ];
      if (
        decodedMessage.emailAdress &&
        !targetEmails.includes(decodedMessage.emailAddress)
      ) {
        console.log(
          `Email ${decodedMessage.emailAddress} not in target list. Ignoring message.`
        );
        return res.status(204).send(); // Ignore messages not matching the filter
      }
    }

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

        if (user.refreshToken) {
          console.log(
            `User ${emailAddress} has a valid refreshToken, proceeding to fetch the latest message.`
          );

          const accessToken = await getAccessTokenFromRefreshToken(
            user.refreshToken
          );

          if (accessToken && user.rules) {
            // Fetch and process the latest email
            const latestMessageResponse = await fetchLatestEmail(accessToken);
            if (
              latestMessageResponse.messages &&
              latestMessageResponse.messages.length > 0
            ) {
              const latestMessage = latestMessageResponse.messages[0];
              console.log("Processing latest message:", latestMessage.id);

              const emailContent = await getMessageDetails(
                accessToken,
                latestMessage.id
              );
              console.log(emailContent);

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

              const rule = user.rules[parseInt(ruleKey)];
              console.log("Rule:", rule);

              for (const action of JSON.parse(rule.type)) {
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
                    const reply = await createDraftEmail(
                      emailContent,
                      action.config.draftTemplate
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
              console.log(`Processed latest email for ${emailAddress}`);
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
  res.send("Hello World!");
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
