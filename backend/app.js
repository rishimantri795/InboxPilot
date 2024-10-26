const express = require("express");
const path = require("path");
const app = express();
const users = require("./routes/users");
const admin = require("./api/firebase.js");
const db = admin.firestore(); // creates ref for firestore db instance which allows us to do read and write operations

require("dotenv").config();
const cors = require("cors"); // req from diff origins
const passport = require("passport");
require("./middleware/passport.js");
const session = require("express-session");

const { getAccessTokenFromRefreshToken } = require("./utils/tokenService.js");
const { accessGmailApi, fetchEmailHistory } = require("./utils/gmailService.js");

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

app.post("/notifications", async (req, res) => {
  const message = req.body.message;

  if (message && message.data) {
    // decodes the base64-encoded message data, parses it as JSON, and extracts
    const buff = Buffer.from(message.data, "base64");
    const decodedMessage = JSON.parse(buff.toString("utf-8"));

    const emailAddress = decodedMessage.emailAddress; // extract email of the notification
    const newHistoryId = decodedMessage.historyId; // extract latest history ID from gmail

    console.log(`Received Pub/Sub Message for ${emailAddress}, historyId: ${newHistoryId}`);

    try {
      // looks up user by email and limits the result to one document
      const userSnapshot = await db.collection("Users").where("email", "==", emailAddress).limit(1).get();

      // if user exists
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data(); // has all the fields

        // check if the newHistoryId is the same as the stored historyId
        // did this because sometimes it would be the same for some reason
        if (user.historyId && user.historyId === newHistoryId) {
          console.log("Duplicate notification received; ignoring this historyId.");
          return res.status(204).send(); // Acknowledge the message and exit
        }

        // fetch a fresh access token
        const accessToken = await getAccessTokenFromRefreshToken(user.refreshToken);

        // get the latest email from the historyId
        if (user.historyId) {
          // fetch emails from historyId to present
          await fetchEmailHistory(accessToken, user.historyId);

          // update the user's historyId to the new one from the notification
          await userDoc.ref.update({ historyId: newHistoryId });
          console.log(`Updated historyId for ${emailAddress} to ${newHistoryId}`);
        } else {
          console.log("No previous historyId found for this user. Saving new historyId.");

          // if no previous historyId, save the current one to start tracking
          await userDoc.ref.update({ historyId: newHistoryId });
        }
      } else {
        console.log(`User with email ${emailAddress} not found in Firestore.`);
      }

      res.status(204).send(); // acknowledge the message
    } catch (error) {
      console.error("Error handling Pub/Sub notification:", error);
      res.status(500).send("Error handling notification");
    }
  } else {
    res.status(400).send("Invalid message");
  }
});

// --- error handling middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// --- serve static files if needed ---
app.use(express.static(path.join(__dirname, "public")));

// --- start the server ---
const port = process.env.PORT || 3010;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
