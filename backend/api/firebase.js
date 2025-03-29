const admin = require("firebase-admin");
require("dotenv").config(); // loads env vars from .env file into process.env

// console.log("FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY);

console.log("HIII");
console.log("ENVARRRR", process.env.FIREBASE_PROJECT_ID);

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-8j22p%40inboxpilot-c4098.iam.gserviceaccount.com",
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// const db = admin.firestore();
// console.log(admin);

// module.exports = { admin, db };
module.exports = admin;
