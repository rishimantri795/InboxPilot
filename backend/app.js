const express = require("express");
const path = require("path");
const Bull = require("bull");
const admin = require("./api/firebase.js");
const db = admin.firestore();
const { getAccessTokenFromRefreshToken } = require("./utils/tokenService.js");
const { fetchEmailHistory } = require("./utils/gmailService.js");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
require("dotenv").config();
require("./middleware/passport.js");

const app = express();
const users = require("./routes/users");
const { access } = require("fs");

// Bull queue configuration
const taskQueue = new Bull("task-queue", {
  redis: {
    host: process.env.HOST, // Replace with your Redis host
    port: 18153, // Replace with your Redis port
    password: process.env.REDISPASS, // Replace with your Redis password
  },
});

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

            // Changed: Direct check of labelIds in the history array
            const hasInboxMessage = history.some((message) => message.labelIds && message.labelIds.includes("INBOX"));

            console.log("HASINBOXMESSAGE" + hasInboxMessage);

            if (hasInboxMessage) {
              console.log(`Found inbox message, enqueueing task for ${emailAddress}`);

              await taskQueue.add({
                email: emailAddress,
                // historyId: newHistoryId,
                historyId: user.historyId,
                accessToken: accessToken,
                rules: user.rules,
              });

              console.log(`Queued task for email: ${emailAddress}, historyId: ${newHistoryId}`, user.rules);

              // Update the user's historyId in Firestore
              await userDoc.ref.update({ historyId: newHistoryId });
              console.log(`Updated historyId for ${emailAddress} to ${newHistoryId}`);
            } else {
              console.log(`No inbox message found in history for ${emailAddress}, skipping task creation`);
            }
          } else {
            console.log(`Task not enqueued due to missing accessToken or rules for email: ${emailAddress}`);
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
// Process the Bull queue

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
