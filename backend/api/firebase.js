const admin = require("firebase-admin");
require("dotenv").config(); // For environment variables
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("./inboxpilot-c4098-firebase-adminsdk-8j22p-febada5cab.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Export the initialized `admin` object
module.exports = admin;
