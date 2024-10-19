require("dotenv");

const auth = {
  type: "OAuth2",
  user: "inboxpilots@gmail.com",
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
};

const mailOptions = {
  to: "sohaibq914@gmail.com",
  from: "inboxpilots@gmail.com",
  subject: "Gmail API using Node JS",
};

module.exports = {
  auth,
  mailOptions,
};
