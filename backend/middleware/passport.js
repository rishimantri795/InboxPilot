const axios = require("axios");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const admin = require("../api/firebase");
const db = admin.firestore();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const https = require("https");
const { watchGmailInbox } = require("../utils/gmailService"); // Import watchGmailInbox function

// Create an https agent that ignores self-signed certificate errors (for development only)
const agent = new https.Agent({
  rejectUnauthorized: false, // Ignore SSL certificate verification
});

// Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      accessType: "offline", // Ensure you get a refresh token
      prompt: "consent", // Force re-consent to get new permissions
      scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"],
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        console.log("Refresh Token:", refreshToken); // Log the refresh token

        // Check if the user exists in Firestore
        const userSnapshot = await db.collection("Users").where("email", "==", profile.emails[0].value).limit(1).get();

        if (!userSnapshot.empty) {
          // User exists, update with the new refresh token (if any)
          const userDocRef = userSnapshot.docs[0].ref;
          const userData = userSnapshot.docs[0].data();
          userData.refreshToken = refreshToken || userData.refreshToken; // Update refreshToken if available
          await userDocRef.update(userData); // Update user with new refresh token

          // Watch Gmail inbox for the authenticated user
          await watchGmailInbox(accessToken);
          return done(null, userData);
        } else {
          // Create a new user in Firestore
          const newUser = {
            id: profile.id,
            email: profile.emails[0].value,
            refreshToken: refreshToken,
            createdAt: new Date(),
          };
          await db.collection("Users").doc(profile.id).set(newUser);

          // Watch Gmail inbox for the authenticated user
          await watchGmailInbox(accessToken);
          return done(null, newUser);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const userDoc = await db.collection("Users").doc(id).get();
    if (userDoc.exists) {
      done(null, userDoc.data());
    } else {
      done(new Error("User not found"));
    }
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
