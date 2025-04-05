const axios = require("axios");
const https = require("https");

const admin = require("../api/firebase");
const db = admin.firestore();
const nodemailer = require("nodemailer");

const agent = new https.Agent({ rejectUnauthorized: false });

async function getAccessTokenFromRefreshToken(storedRefreshToken) {
  if (storedRefreshToken === -1) {
    console.warn("🚫 Skipping token refresh for invalidated token (-1)");
    return null;
  }
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
    });

    const newAccessToken = response.data.access_token;
    console.log("✅ New access token:", newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error("❌ Error fetching access token:", error.response?.data || error.message);

    try {
      const snapshot = await db.collection("Users").where("refreshToken", "==", storedRefreshToken).limit(1).get();

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userRef = userDoc.ref;
        const userEmail = userDoc.data().email;

        // Clear invalid token
        await userRef.update({ refreshToken: -1 });
        console.log(`⚠️ Cleared invalid refresh token for user ${userEmail}`);

        // Send re-auth email
        if (userEmail) {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          const mailOptions = {
            from: `"Inbox Pilot" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Please Reauthorize Inbox Pilot",
            html: `
                <p>Hi there,</p>
                <p>We couldn't refresh your access to Gmail. Please sign in again to continue using Inbox Pilot features:</p>
                <a href="${process.env.FRONTEND_URL}/login">Click here to sign in</a>
                <p>Thanks,<br>The Inbox Pilot Team</p>
              `,
          };

          await transporter.sendMail(mailOptions);
          return null;
          console.log("📧 Re-auth email sent to:", userEmail);
        }
      } else {
        console.log("⚠️ No user found with that refresh token.");
      }
    } catch (lookupError) {
      console.error("🔥 Failed to clear refresh token or send email:", lookupError);
    }

    return null;
  }
}

async function validRefreshToken(refreshToken) {
  const tokenEndpoint = "https://oauth2.googleapis.com/token";

  const params = new URLSearchParams();
  params.append("client_id", process.env.CLIENT_ID);
  params.append("client_secret", process.env.CLIENT_SECRET);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  try {
    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      httpsAgent: agent,
    });

    if (response.data.access_token) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error fetching access token:", error.response.data);
  }
}

module.exports = { getAccessTokenFromRefreshToken };
