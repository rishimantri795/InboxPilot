const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const admin = require("../api/firebase");
const db = admin.firestore();
const { watchGmailInbox } = require("../utils/gmailService");
const { google } = require("googleapis");
const { saveEmailChunks } = require("../utils/RAGService");
const { getMessageDetails } = require("../utils/gmailService");

// Delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchLast50Emails(accessToken) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 300,
    });

    if (!response.data.messages) {
      console.log("No emails found.");
      return [];
    }

    // Fetch full details for each message and include the message ID
    const emailDetails = [];
    for (let i = 0; i < response.data.messages.length; i++) {
      const message = response.data.messages[i];

      // Fetch email content using the message ID
      const emailContent = await getMessageDetails(accessToken, message.id);

      // Add a rate-limiting delay (e.g., 500ms between requests)
      await delay(500); // Adjust the delay based on your needs

      // Push the result into the array
      emailDetails.push({
        messageId: message.id,
        content: emailContent,
      });
    }

    return emailDetails;
  } catch (error) {
    console.error("Error fetching emails:", error);
  }
}

// passport google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      accessType: "offline", // ensure you get a refresh token
      prompt: "consent", // force re-consent to get new permissions
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // check if user exists in db matching the email passed in
        const userSnapshot = await db
          .collection("Users")
          .where("email", "==", profile.emails[0].value)
          .limit(1)
          .get(); // limit(1) limits to 1 doc and .get() returns querySnapshot

        // why we can't do userSnapshot? ---> bc firestore always returns a QuerySnapshot object, even if not docs match
        if (!userSnapshot.empty) {
          const userDocRef = userSnapshot.docs[0].ref; // doc reference which allows to perform operations such update on doc
          const userData = userSnapshot.docs[0].data(); // extracts the actual data from the doc as a javascript object

          console.log("HIII");
          console.log("IN DB", userData.refreshToken);
          console.log("NEW REFRESH TOKEN", refreshToken);
          userData.refreshToken = refreshToken || userData.refreshToken; // update refreshToken if available
          await userDocRef.update(userData); // update user with potentially new refresh token

          // puts a gmail listener to user

          // Then fetch any messages since last sync
          // await fetchEmailHistoryAndApplyLabel(accessToken, historyId);

          // indicates finished authentication. 1st arg is error which is null bc no errors occurred.
          // 2nd arg is userData to establish a session
          return done(null, userData);
        }
        // user is not in db so let's create a new user
        else {
          // create a new user in firestore
          const newUser = {
            id: profile.id,
            email: profile.emails[0].value,
            refreshToken: refreshToken,
            createdAt: new Date(),
          };

          // actually creates the user in db
          await db.collection("Users").doc(profile.id).set(newUser);

          // puts a gmail listener to user
          // newUser.historyId = historyId; // Add historyId
          // await userDocRef.update(newUser);

          let emails = await fetchLast50Emails(accessToken);

          console.log("TEMP", emails[0]);

          for (let i = 0; i < emails.length; i++) {
            await saveEmailChunks(
              newUser.id,
              emails[i].messageId,
              emails[i].content
            );
          }
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
