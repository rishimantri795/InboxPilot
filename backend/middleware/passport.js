const axios = require("axios");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const admin = require("../api/firebase");
const db = admin.firestore();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const https = require("https");

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
        const userDoc = await db.collection("Users").doc(profile.id).get();

        if (userDoc.exists) {
          // If user exists, update with the new refresh token (if any)
          const userData = userDoc.data();
          userData.refreshToken = refreshToken || userData.refreshToken; // Update refreshToken if available
          await db.collection("Users").doc(profile.id).update(userData); // Update user with new refresh token
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
          return done(null, newUser);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize user by Google ID
});

passport.deserializeUser(async (id, done) => {
  try {
    const userDoc = await db.collection("Users").doc(id).get();
    if (userDoc.exists) {
      done(null, userDoc.data());
    } else {
      done(new Error("User not found"));
    }
  } catch (err) {
    done(err);
  }
});

// Main function to handle access token and Gmail API requests
async function main() {
  const storedRefreshToken = "1//04WlMQ_0YYKe3CgYIARAAGAQSNwF-L9IrYxPKOtV-M6mXO1WIb1z9fry4EVAg4v8VRAqH4CW3qLQM-oPQdI0MTuY_FOdwRHkWoMI"; // Replace with valid refresh token

  async function getAccessTokenFromRefreshToken(storedRefreshToken) {
    const tokenEndpoint = "https://oauth2.googleapis.com/token";

    const params = new URLSearchParams();
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("refresh_token", storedRefreshToken);
    params.append("grant_type", "refresh_token");

    try {
      const response = await axios.post(tokenEndpoint, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent: agent, // Use the https agent here
      });

      const newAccessToken = response.data.access_token;
      console.log("New access token:", newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error("Error fetching access token:", error.response.data);
    }
  }

  async function accessGmailApi(accessToken) {
    const gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

    try {
      // First, get a list of message IDs
      const response = await axios.get(gmailEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Use the access token here
          Accept: "application/json",
        },
        params: { maxResults: 10 },
        httpsAgent: agent, // Use the https agent here
      });

      const messageIds = response.data.messages.map((message) => message.id);
      console.log("Gmail Messages:", messageIds);

      // Fetch full details for each message
      for (const messageId of messageIds) {
        await getMessageDetails(messageId, accessToken);
      }
    } catch (error) {
      console.error("Error accessing Gmail API:", error.response ? error.response.data : error.message);
    }
  }

  async function getMessageDetails(messageId, accessToken) {
    const messageEndpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;

    try {
      const response = await axios.get(messageEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        httpsAgent: agent, // Use the https agent here
      });

      console.log("Message Details:", response.data); // Log the full message details
    } catch (error) {
      console.error(`Error fetching details for message ID ${messageId}:`, error.response ? error.response.data : error.message);
    }
  }

  // Get new access token from refresh token
  const accessToken = await getAccessTokenFromRefreshToken(storedRefreshToken);
  if (accessToken) {
    await accessGmailApi(accessToken); // Access Gmail using the access token
  }
}

// Call the main function
main().catch(console.error);

// --------

module.exports = passport;
