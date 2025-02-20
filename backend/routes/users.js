const express = require("express");
const admin = require("../api/firebase.js"); // import the firebase admin object
const passport = require("passport");
const multer = require("multer");
const AWS = require("aws-sdk");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
require("dotenv").config(); // we get the env vars in process.env

const db = admin.firestore();
const axios = require("axios");

const cookieParser = require("cookie-parser");
router.use(cookieParser()); // enables us to use cookies in the router
const { watchGmailInbox, startDevWatch } = require("../utils/gmailService.js");
const { getAccessTokenFromRefreshToken } = require("../utils/tokenService.js");
const { fetchOutlookEmails, subscribeToOutlookEmails, getAccessTokenFromRefreshTokenOutlook, getRefreshTokenOutlook } = require("../utils/outlookService.js");

// initiates the google OAuth authentication process
router.get("/google/auth", (req, res) => {
  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"],
    accessType: "offline", // requests a refresh token so we have access even after user logs out
    approvalPrompt: "force",
  })(req, res);
});

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// initiates the google OAuth authentication process
router.get("/google/auth", (req, res) => {
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/calendar",
    ],
    accessType: "offline", // requests a refresh token so we have access even after user logs out
    approvalPrompt: "force",
  })(req, res);
});

// handles the callback from google after authentication
router.get(
  "/google/auth/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/`, // goes here if authentication fails
  }),
  async (req, res) => {
    try {
      res.redirect(`${process.env.FRONTEND_URL}/rules`); // goes here if authentication succeeds
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

/** ================================
 * 🔹 MICROSOFT OUTLOOK OAUTH ROUTES
 * ================================= **/
router.get("/outlook/auth", passport.authenticate("microsoft"));

router.get("/outlook/auth/callback", passport.authenticate("microsoft", { failureRedirect: `${process.env.FRONTEND_URL}/` }), async (req, res) => {
  console.log("✅ Microsoft OAuth Callback triggered.");

  // Start Outlook Email Listener
  try {
    console.log("HIII!!!", req.user.refreshToken);
    const accessToken = await getAccessTokenFromRefreshTokenOutlook(req.user.refreshToken);
    console.log("🔹 OUTLOOK Access Token:", accessToken);
    await subscribeToOutlookEmails(accessToken);
  } catch (error) {
    console.error("❌ Error setting up email listener:", error);
  }

  if (!req.user) {
    return res.status(401).send("Authentication failed.");
  }

  res.redirect(`${process.env.FRONTEND_URL}/rules`);
});

/** ================================
 * 🔹 FETCH OUTLOOK EMAILS
 * ================================= **/
router.get("/outlook/emails", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send("Unauthorized.");

  const accessToken = req.user.refreshToken;
  const emails = await fetchOutlookEmails(accessToken);

  if (emails) {
    res.json(emails);
  } else {
    res.status(500).send("Failed to fetch emails.");
  }
});

// router.post("/outlook/webhook", async (req, res) => {
//   console.log("📩 New Outlook Email Notification Received!", req.body);

//   if (req.body.value) {
//     for (const event of req.body.value) {
//       console.log("🔹 Email Change Detected:", event);

//       // If the event is for a new email
//       if (event.resourceData && event.resourceData.id) {
//         console.log(`📬 New Email ID: ${event.resourceData.id}`);

//         // Fetch the full email details
//         const emailDetails = await getEmailById(event.resourceData.id);
//         console.log("📧 New Email Details:", emailDetails);
//       }
//     }
//   }

//   res.sendStatus(200);
// });

// const processedMessages = new Set();

// function markMessageProcessed(messageId, ttl = 3600000) {
//   processedMessages.add(messageId);
//   setTimeout(() => processedMessages.delete(messageId), ttl);
// }

router.get("/outlook/webhook", (req, res) => {
  console.log("🔹 Microsoft Graph validation request received");

  // Microsoft sends a "validationToken" query parameter during subscription
  const validationToken = req.query.validationToken;

  if (validationToken) {
    console.log("✅ Sending back validation token:", validationToken);
    return res.status(200).send(validationToken);
  }

  res.status(400).send("Missing validation token");
});
router.post("/outlook/webhook", async (req, res) => {
  // ✅ Handle Microsoft validation request
  if (req.query && req.query.validationToken) {
    console.log("🔹 Responding to validation request...");
    return res.status(200).send(req.query.validationToken);
  }

  console.log("📩 Received email notification:", JSON.stringify(req.body, null, 2));

  try {
    // 🔹 Extract message ID from webhook notification
    const notification = req.body.value && req.body.value[0];
    if (!notification || !notification.resourceData || !notification.resourceData.id) {
      console.error("❌ No message ID found in webhook notification.");
      return res.status(400).send("Invalid webhook notification.");
    }

    const messageId = notification.resourceData.id;

    // if (processedMessages.has(messageId)) {
    //   console.log(`Message ${messageId} already processed. Skipping duplicate.`);
    //   return res.status(200).send("Duplicate notification ignored.");
    // }
    // // Mark this message as processed (with a TTL if desired)
    // markMessageProcessed(messageId);

    // if (notification.changeType !== "created") {
    //   console.log(`Skipping notification with changeType: ${notification.changeType}`);
    //   return res.status(200).send("Non-created change ignored.");
    // }

    console.log(`📧 New Email Received! Fetching content for Message ID: ${messageId}`);

    // 🔹 Extract userId from resource (e.g., "Users/{userId}/Messages/{messageId}")
    const resourceParts = notification.resource.split("/");
    const userId = resourceParts.length > 1 ? resourceParts[1] : null;
    console.log("USER ID!!!", userId);
    // 🔹 Fetch email content from Microsoft Graph API
    const refreshToken = await getRefreshTokenOutlook(userId);
    const accessToken = await getAccessTokenFromRefreshTokenOutlook(refreshToken);
    const emailResponse = await axios.get(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const email = emailResponse.data;

    // 🔹 Print out email details
    console.log("📨 Email Details:");
    console.log(`📍 Subject: ${email.subject}`);
    console.log(`📤 From: ${email.from.emailAddress.name} <${email.from.emailAddress.address}>`);
    console.log(`📩 To: ${email.toRecipients.map((r) => r.emailAddress.address).join(", ")}`);
    console.log(`📝 Body Preview: ${email.bodyPreview}`);

    res.status(202).send("Accepted");
  } catch (error) {
    console.error("❌ Error fetching email details:", error.response ? error.response.data : error.message);
    // res.status(200).send("Accepted");
    res.status(500).send("Error processing webhook");
  }
});

// Utility function to get an access token either from header or from session.
async function getAccessToken(req) {
  // If the Authorization header is present, use it.
  if (req.headers.authorization) {
    // Expecting format "Bearer <token>"
    const token = req.headers.authorization.split(" ")[1];
    if (token) return token;
  }
  // Otherwise, fall back to using req.user.refreshToken.
  if (!req.user || !req.user.refreshToken) {
    throw new Error("User is not authenticated or refresh token is missing.");
  }
  return await getAccessTokenFromRefreshTokenOutlook(req.user.refreshToken);
}

// Archive Route
router.post("/outlook/email/:id/archive", async (req, res) => {
  const emailId = req.params.id;
  try {
    const accessToken = await getAccessToken(req);

    // Fetch the Archive folder details.
    const archiveFolderResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me/mailFolders/Archive",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const archiveFolderId = archiveFolderResponse.data.id;

    // Move the message to the Archive folder.
    const moveResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/move`,
      { destinationId: archiveFolderId },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    res.status(200).json({ message: "Email archived successfully.", data: moveResponse.data });
  } catch (error) {
    console.error("Error archiving email:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to archive email." });
  }
});

// Favorite Route
router.post("/outlook/email/:id/favorite", async (req, res) => {
  const emailId = req.params.id;
  try {
    const accessToken = await getAccessToken(req);

    // Update the email's flag property to "flagged".
    const patchResponse = await axios.patch(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
      { flag: { flagStatus: "flagged" } },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    res.status(200).json({ message: "Email favorited (flagged) successfully.", data: patchResponse.data });
  } catch (error) {
    console.error("Error favoriting email:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to favorite email." });
  }
});

// Label Route
router.post("/outlook/email/:id/label", async (req, res) => {
  const emailId = req.params.id;
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: "Missing label in request body." });
  }
  try {
    const accessToken = await getAccessToken(req);

    // First, fetch the current categories (if any).
    const getResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    let categories = getResponse.data.categories || [];

    // Add the new label if it does not exist.
    if (!categories.includes(label)) {
      categories.push(label);
    }

    // Update the message with the new categories array.
    const patchResponse = await axios.patch(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}`,
      { categories },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    res.status(200).json({ message: "Email labeled successfully.", data: patchResponse.data });
  } catch (error) {
    console.error("Error labeling email:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to label email." });
  }
});

// Forward Route
router.post("/outlook/email/:id/forward", async (req, res) => {
  const emailId = req.params.id;
  const { toRecipients, comment } = req.body;
  if (!toRecipients || !Array.isArray(toRecipients) || toRecipients.length === 0) {
    return res.status(400).json({ error: "Missing or invalid toRecipients array in request body." });
  }
  try {
    const accessToken = await getAccessToken(req);

    // Prepare recipients in the required format.
    const formattedRecipients = toRecipients.map((email) => ({
      emailAddress: { address: email },
    }));

    // Call the forward action endpoint.
    await axios.post(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/forward`,
      { comment: comment || "", toRecipients: formattedRecipients },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
    );
    res.status(200).json({ message: "Email forwarded successfully." });
  } catch (error) {
    console.error("Error forwarding email:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to forward email." });
  }
});

//! new
async function stopGmailWatch(accessToken) {
  const gmailEndpoint = "https://gmail.googleapis.com/gmail/v1/users/me/stop";

  try {
    // Make a POST request to the Gmail API's /stop endpoint
    const response = await axios.post(
      gmailEndpoint,
      {}, // Empty request body
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Access token for authentication
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Gmail watch stopped successfully:", response.data);

    // Return success along with the response data
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error stopping Gmail watch:", error.response?.data || error.message);

    // Return failure along with error details
    return { success: false, error: error.response?.data || error.message };
  }
}

//! new
router.post("/detach-gmail-listener", async (req, res) => {
  try {
    const { refreshToken } = req.user; // Get refreshToken from authenticated user

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token not found" });
    }

    // Fetch a new access token from the refresh token
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    // Call the stopGmailWatch function
    const result = await stopGmailWatch(accessToken);

    if (result.success) {
      return res.status(200).json({
        message: "Dev watch successfully",
        data: result.data,
      });
    } else {
      return res.status(500).json({ error: "Failed to stop Gmail watch", details: result.error });
    }
  } catch (error) {
    console.error("Error detaching Gmail listener:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/attach-dev-listener", async (req, res) => {
  try {
    const { refreshToken } = req.user; // Get refreshToken from authenticated user

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token not found" });
    }

    // Fetch a new access token from the refresh token
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    // Call the stopGmailWatch function
    const result = await stopGmailWatch(accessToken);

    const result2 = await startDevWatch(accessToken);

    if (result.success) {
      return res.status(200).json({
        message: "Prod listener attached successfully",
        data: result.data,
      });
    } else {
      return res.status(500).json({ error: "Failed to attach Dev listener", details: result.error });
    }
  } catch (error) {
    console.error("Error detaching Dev listener:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/attach-prod-listener", async (req, res) => {
  try {
    const { refreshToken } = req.user; // Get refreshToken from authenticated user

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token not found" });
    }

    // Fetch a new access token from the refresh token
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    // Call the stopGmailWatch function
    const result = await stopGmailWatch(accessToken);

    const result2 = await watchGmailInbox(accessToken);

    if (result.success) {
      return res.status(200).json({
        message: "Prod listener attached successfully",
        data: result.data,
      });
    } else {
      return res.status(500).json({ error: "Failed to attach Prod listener", details: result.error });
    }
  } catch (error) {
    console.error("Error detaching Gmail listener:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// firebase auth belowWW
// ***************************************************************************************************

router.post("/verifyToken", async (req, res) => {
  const token = req.body.idToken;
  console.log(token);

  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Create a session or perform further actions (e.g., check user roles)
    // res.status(200).json({
    //   uid: decodedToken.uid,
    //   email: decodedToken.email,

    //   message: "User authenticated",
    // });
    const uid = decodedToken.uid;
    const name = decodedToken.name || "John Doe";

    // Generate a new user ID (you can also let Firestore generate it)
    const newUserRef = db.collection("Users").doc(uid); // This generates a new document reference

    // Create a new user document with the provided data
    await newUserRef.set({
      email: decodedToken.email,
      name,
      rules: {
        // Assuming you want to store the first rule as provided
        0: {
          action: "default",
          prompt: "default",
          type: "default",
        },
      },
      createdAt: new Date(), // Optional: add a timestamp
    });

    // Send a success response
    res.status(200).send({ id: newUserRef.id, message: "User created successfully!" });
  } catch (error) {
    res.status(401).send("Unauthorized");
  }
});

router.post("/verifyRefreshToken", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;

    const tokenEndpoint = "https://oauth2.googleapis.com/token";

    const response = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.access_token) {
      res.status(200).json({ valid: true, message: "Refresh token is valid." });
    } else {
      res.status(400).json({ valid: false, message: "Invalid refresh token." });
    }
  } catch (error) {
    // If Google returns a 4xx status (client error)
    if (error.response && error.response.status === 400) {
      res.status(400).json({ valid: false, message: "Invalid refresh token." });
    } else {
      console.error("Error verifying token:", error);
      res.status(500).json({ valid: false, message: "Token verification failed." });
    }
  }
});

router.get("/current-user", (req, res) => {
  console.log("Is authenticated cookies:", req.cookies);
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

router.post("/logout", (req, res) => {
  console.log("Cookies before clearing:", req.cookies);
  req.logout(function (err) {
    if (err) {
      console.error("Error during logout:", err);
      return res.status(500).send("Error logging out");
    }
    req.session.destroy(function (err) {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).send("Error destroying session");
      }
      // res.clearCookie("connect.sid");
      res.clearCookie("connect.sid", {
        path: "/", // Ensure the path matches
        secure: false, // Set to true if using HTTPS
        sameSite: "lax", // Match your configuration
      });
      console.log("Cookies after clearing:", req.cookies);
      res.status(200).send("Logged out successfully");
    });
  });
});

router.get(
  "/google/auth/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:3000/", // goes here if authentication fails
  }),
  async (req, res) => {
    try {
      // Get access token from the authenticated user
      const accessToken = req.user.accessToken;

      if (accessToken) {
        try {
          // Set up Gmail watch
          const historyId = await watchGmailInbox(accessToken);

          // Store the historyId in Firestore
          if (req.user.id) {
            await db.collection("Users").doc(req.user.id).update({
              historyId: historyId,
            });
          }
        } catch (error) {
          console.error("Error setting up Gmail watch:", error);
          // Continue with redirection even if watch setup fails
        }
      }

      res.redirect("http://localhost:3000/rules");
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

router.get("/auth/success", (req, res) => {
  res.send("user created ");
});

router.get("/auth/failure", (req, res) => {
  res.send("failed");
});

router.get("/", async (req, res) => {
  try {
    const Users = await db.collection("Users").get();

    const users = Users.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(users);
    res.status(200).json(users); // Send users as response
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching users");
  }
});

router.post("/:id", async (req, res) => {
  const { id } = req.params;
  const { action, prompt, type } = req.body;

  if (!id) {
    res.status(400).send("Missing user id");
    return;
  }

  if (!action || !prompt || !type) {
    return res.status(400).json({ error: "Missing rule data" });
  }

  let User = await db.collection("Users").doc(`${id}`);

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const existingRules = userData.rules || {};

    const existingIndices = Object.keys(existingRules)
      .map(Number)
      .filter((num) => !isNaN(num));
    const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;

    await userRef.update({
      [`rules.${nextIndex}`]: {
        action,
        prompt,
        type,
      },
    });

    // Fetch the updated document
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    return res.status(200).json({
      message: "Rule added successfully",
      user: {
        id: updatedUserDoc.id,
        ...updatedUserData,
      },
      id: nextIndex,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/users/:id/rules/:ruleIndex
router.delete("/:id/rules/:ruleIndex", async (req, res) => {
  const { id, ruleIndex } = req.params;

  if (!id) {
    return res.status(400).send("Missing user ID.");
  }

  const parsedIndex = Number(ruleIndex);
  if (isNaN(parsedIndex)) {
    return res.status(400).json({ error: "Invalid rule index." });
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const existingRules = userData.rules || {};

    if (!existingRules.hasOwnProperty(parsedIndex)) {
      return res.status(404).json({ error: "Rule not found." });
    }

    await userRef.update({
      [`rules.${parsedIndex}`]: admin.firestore.FieldValue.delete(),
    });

    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    return res.status(200).json({
      message: "Rule deleted successfully.",
      user: {
        id: updatedUserDoc.id,
        ...updatedUserData,
      },
    });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
});

router.put("/:id/rules/:ruleIndex", async (req, res) => {
  const { id, ruleIndex } = req.params;
  const { action, prompt, type } = req.body;

  if (!id) {
    return res.status(400).send("Missing user ID.");
  }

  if (!action || !prompt || !type) {
    return res.status(400).json({ error: "Missing rule data." });
  }

  const parsedIndex = Number(ruleIndex);
  if (isNaN(parsedIndex)) {
    return res.status(400).json({ error: "Invalid rule index." });
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const existingRules = userData.rules || {};

    if (!existingRules.hasOwnProperty(parsedIndex)) {
      return res.status(404).json({ error: "Rule not found." });
    }

    await userRef.update({
      [`rules.${parsedIndex}.action`]: action,
      [`rules.${parsedIndex}.prompt`]: prompt,
      [`rules.${parsedIndex}.type`]: type,
    });

    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    return res.status(200).json({
      message: "Rule updated successfully.",
      user: {
        id: updatedUserDoc.id,
        ...updatedUserData,
      },
    });
  } catch (error) {
    console.error("Error updating rule:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
});

router.get("/:id/rules", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send("Missing user ID.");
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const existingRules = userData.rules || {};

    const rules = Object.keys(existingRules)
      .map((key) => ({
        ruleIndex: key, // include rule index
        ...existingRules[key],
      }))
      .sort((a, b) => Number(a.ruleIndex) - Number(b.ruleIndex));

    return res.status(200).json(rules);
  } catch (error) {
    console.error("Error fetching rules:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
});


router.delete("/", (req, res) => {});

router.get("/:id", (req, res) => {});

//route to get profile info from user db

router.get("/:id/profile", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send("Missing user ID.");
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const existingProfile = userData.profile || [];

    return res.status(200).json(existingProfile);
  } catch (error) {
    console.error("Error fetching rules:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
});

router.post("/:id/add_to_profile", async (req, res) => {
  const { id } = req.params;
  const { info } = req.body;

  if (!id) {
    return res.status(400).send("Missing user ID.");
  }

  if (!info) {
    return res.status(400).json({ error: "Missing profile data." });
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const existingProfile = userData.profile || [];

    existingProfile.push(info);

    await userRef.update({
      profile: existingProfile,
    });

    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUserDoc.id,
        ...updatedUserData,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
});

router.post("/:id/delete_from_profile", async (req, res) => {
  const { id } = req.params;
  const { info } = req.body;

  if (!id) {
    return res.status(400).send("Missing user ID.");
  }

  if (!info) {
    return res.status(400).json({ error: "Missing profile data." });
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const existingProfile = userData.profile || [];

    const updatedProfile = existingProfile.filter((item) => item !== info);

    await userRef.update({
      profile: updatedProfile,
    });

    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    return res.status(200).json({
      message: "Profile item deleted successfully.",
      user: {
        id: updatedUserDoc.id,
        ...updatedUserData,
      },
    });
  } catch (error) {
    console.error("Error deleting profile item:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
});

router.get("/:id/listener-status", async (req, res) => {
  const { id } = req.params;

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const status = userData.listenerStatus || 0; // Default to 0 if not set

    return res.status(200).json({ status });
  } catch (error) {
    console.error("Error fetching listener status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/toggle-listener", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 0 (detach) or 1 (attach)

  if (![0, 1].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userDoc.data();
    const refreshToken = userData.refreshToken; // Get refresh token from Firestore

    if (!refreshToken) {
      return res.status(400).json({ error: "No refresh token found." });
    }

    // Fetch a new access token from the refresh token
    const accessToken = await getAccessTokenFromRefreshToken(refreshToken);

    if (status === 0) {
      // If detaching, call stopGmailWatch()
      console.log("Detaching Gmail Listener...");
      const stopResult = await stopGmailWatch(accessToken);
      if (!stopResult.success) {
        return res.status(500).json({ error: "Failed to stop Gmail watch", details: stopResult.error });
      }
    } else {
      // If attaching, determine which function to call
      if (process.env.DEV_TARGET_EMAILS === "true") {
        console.log("Attaching Dev Watch...");
        const watchResult = await startDevWatch(accessToken);
        if (!watchResult) {
          return res.status(500).json({ error: "Failed to start Dev Gmail watch" });
        }
      } else {
        console.log("Attaching Production Watch...");
        const watchResult = await watchGmailInbox(accessToken);
        if (!watchResult) {
          return res.status(500).json({ error: "Failed to start Production Gmail watch" });
        }
      }
    }

    // Update Firestore with the new status
    await userRef.update({ listenerStatus: status });

    return res.status(200).json({ message: `Listener ${status === 1 ? "attached" : "detached"} successfully.` });
  } catch (error) {
    console.error("Error toggling listener status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/upload-rule-files", upload.array("files"), async (req, res) => {
  const { id } = req.params;
  const { ruleIndex } = req.body; // Expect the client to pass which rule these files belong to

  if (!id || ruleIndex === undefined) {
    return res.status(400).json({ error: "User ID and rule index are required." });
  }

  try {
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }
    
    // Get the specific rule from the user's rules.
    const userData = userDoc.data();
    const ruleData = userData.rules ? userData.rules[ruleIndex] : null;
    if (!ruleData) {
      return res.status(404).json({ error: "Rule not found." });
    }
    
    // Parse the actions array from the stored JSON string.
    const actions = ruleData.type || [];
    
    // Find the draft action in the actions array.
    const draftActionIndex = actions.findIndex((action) => action.type === "draft");
    if (draftActionIndex === -1) {
      return res.status(400).json({ error: "Draft action not found in the rule." });
    }

    // Upload each file to S3.
    const bucketName = process.env.S3_BUCKET;
    const newFilesPromises = req.files.map(async (file) => {
      // Generate a unique key for the file in S3
      const s3Key = `uploads/${Date.now()}-${file.originalname}`;
      
      // Prepare the upload parameters
      const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // Upload the file to S3
      const data = await s3.upload(uploadParams).promise();

      // Return an enriched file object.
      return {
        fileName: file.originalname,
        mimeType: file.mimetype,
        s3Key, // optionally store the S3 key for future reference
        s3Url: data.Location, // S3 returns the public URL if your bucket policy allows it
        uploadedAt: new Date().toISOString(),
      };
    });

    // Wait for all files to upload.
    const newFiles = await Promise.all(newFilesPromises);
    
    // Get any existing files from the draft action.
  const existingFiles = actions[draftActionIndex].config.contextFiles || [];

  // Filter out raw or minimal entries (that don't have s3Url)
  const existingEnriched = existingFiles.filter(file => file && file.s3Url);

  // Merge the already enriched files with the new enriched files.
  const mergedFiles = [...existingEnriched, ...newFiles];

  actions[draftActionIndex].config.contextFiles = mergedFiles;

  // Update the rule document with the merged files.
  await userRef.update({
    [`rules.${ruleIndex}.type`]: actions
  });
    
    return res.status(200).json({ message: "Files added successfully.", files: newFiles });
  } catch (error) {
    console.error("Error updating rule file data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id/delete-rule-file", async (req, res) => {
  const { id } = req.params;
  // Expect the client to send the rule index and the s3Key of the file to be deleted
  const { ruleIndex, fileS3Key } = req.body;

  if (!id || ruleIndex === undefined || !fileS3Key) {
    return res.status(400).json({ error: "User ID, rule index, and file s3Key are required." });
  }

  try {
    // Get the user document
    const userRef = db.collection("Users").doc(id);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found." });
    }
    
    // Get the specific rule
    const userData = userDoc.data();
    const ruleData = userData.rules ? userData.rules[ruleIndex] : null;
    if (!ruleData) {
      return res.status(404).json({ error: "Rule not found." });
    }
    
    // Get the actions array (stored directly, not as a JSON string)
    const actions = ruleData.type || [];
    
    // Find the draft action (where the contextFiles are stored)
    const draftActionIndex = actions.findIndex((action) => action.type === "draft");
    if (draftActionIndex === -1) {
      return res.status(400).json({ error: "Draft action not found in the rule." });
    }
    
    // Delete the file from S3
    const deleteParams = {
      Bucket: process.env.S3_BUCKET,
      Key: fileS3Key,
    };
    await s3.deleteObject(deleteParams).promise();
    
    // Remove the file from the contextFiles array in Firestore
    const existingFiles = actions[draftActionIndex].config.contextFiles || [];
    const updatedFiles = existingFiles.filter(file => file.s3Key !== fileS3Key);
    actions[draftActionIndex].config.contextFiles = updatedFiles;
    
    // Update the Firestore document with the new actions array
    await userRef.update({
      [`rules.${ruleIndex}.type`]: actions
    });
    
    return res.status(200).json({ message: "File deleted successfully." });
  } catch (error) {
    console.error("Error deleting rule file:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
