const axios = require("axios");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function getAccessTokenFromRefreshToken(storedRefreshToken) {
  const tokenEndpoint = "https://oauth2.googleapis.com/token";

  // params needed to generate access token from endpoint
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
      httpsAgent: agent,
    });

    const newAccessToken = response.data.access_token;
    console.log("New access token:", newAccessToken);
    return newAccessToken;
    // sort of verifies the refresh token because will produce an error
    // if access token can't be generated
  } catch (error) {
    console.error("Error fetching access token:", error.response.data);
  }
}

module.exports = { getAccessTokenFromRefreshToken };
