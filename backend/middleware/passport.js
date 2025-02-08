const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const admin = require("../api/firebase");
const db = admin.firestore();
const { watchGmailInbox } = require("../utils/gmailService");

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
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events.readonly",
        "https://www.googleapis.com/auth/calendar",
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
          userData.historyId = historyId; // Add historyId
          await userDocRef.update(userData);

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
