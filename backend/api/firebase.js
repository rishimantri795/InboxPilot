const admin = require("firebase-admin");
require("dotenv").config(); // loads env vars from .env file into process.env

// init firebase admin
const serviceAccount = require("./firebase.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
