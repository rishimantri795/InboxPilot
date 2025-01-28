const express = require("express");
const admin = require("../api/firebase.js"); // import the firebase admin object
const passport = require("passport");

const router = express.Router();
require("dotenv").config(); // we get the env vars in process.env

const db = admin.firestore();
const axios = require("axios");

const cookieParser = require("cookie-parser");
router.use(cookieParser()); // enables us to use cookies in the router
const { watchGmailInbox } = require("../utils/gmailService.js");
const { getAccessTokenFromRefreshToken } = require("../utils/tokenService.js");

// initiates the google OAuth authentication process
router.get("/google/auth", (req, res) => {
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
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
    console.error(
      "Error stopping Gmail watch:",
      error.response?.data || error.message
    );

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
        message: "Gmail watch stopped successfully",
        data: result.data,
      });
    } else {
      return res
        .status(500)
        .json({ error: "Failed to stop Gmail watch", details: result.error });
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
    res
      .status(200)
      .send({ id: newUserRef.id, message: "User created successfully!" });
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
      res
        .status(500)
        .json({ valid: false, message: "Token verification failed." });
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
    const nextIndex =
      existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;

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

    // Transform rules object into an array
    const rules = Object.keys(existingRules)
      .map((key) => ({
        ruleIndex: key,
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

module.exports = router;
