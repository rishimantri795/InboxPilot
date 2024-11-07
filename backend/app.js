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
    secret: "happy",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // insecure for development
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

    console.log(
      `Received Pub/Sub Message for ${emailAddress}, historyId: ${newHistoryId}`
    );

    try {
      const userSnapshot = await db
        .collection("Users")
        .where("email", "==", emailAddress)
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();

        if (user.historyId && user.historyId === newHistoryId) {
          console.log(
            "Duplicate notification received; ignoring this historyId."
          );
          return res.status(204).send();
        }
        console.log(user.refreshToken);

        const accessToken = await getAccessTokenFromRefreshToken(
          user.refreshToken
        );

        // Add job to the Bull queue
        await taskQueue.add({
          email: emailAddress,
          historyId: user.historyId,
          accessToken: accessToken,
        });

        console.log(
          `Queued task for email: ${emailAddress}, historyId: ${user.historyId}`
        );

        // Update the user's historyId in Firestore
        await userDoc.ref.update({ historyId: newHistoryId });
        console.log(`Updated historyId for ${emailAddress} to ${newHistoryId}`);
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
