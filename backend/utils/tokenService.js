const axios = require("axios");
const https = require("https");

const admin = require("../api/firebase");
const db = admin.firestore();
const nodemailer = require("nodemailer");

const agent = new https.Agent({ rejectUnauthorized: false });

async function getAccessTokenFromRefreshToken(storedRefreshToken, userId = null) {
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

    if (userId && error.response && error.response.status === 400 && error.response.data.error === "invalid_grant") {
      try {
        const userDoc = await db.collection("Users").doc(userId).get();
        if (userDoc.exists) {
          const userEmail = userDoc.data().email;

          await db.collection("Users").doc(userId).update({ refreshToken: 0 });
          console.log(`⚠️ Invalid refresh token. Cleared for user ${userEmail}`);

          // send reauth email
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
            console.log("📧 Reauth email sent to", userEmail);
          }
        }
      } catch (err) {
        console.error("⚠️ Error handling invalid refresh token:", err);
      }
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
