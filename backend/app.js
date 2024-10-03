const express = require("express");
const path = require("path");
const app = express();
const users = require("./routes/users");
const admin = require("./api/firebase.js"); // Import Firebase Admin from firebase.js
require("dotenv").config(); // For environment variables

app.use(express.json());

// Initialize Firebase Admin
// const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT ||
//   "../backend/API/inboxpilot-c4098-firebase-adminsdk-8j22p-febada5cab.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// Routes
app.use("/api/users", users);

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
