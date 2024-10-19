const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const admin = require("../api/firebase");
const db = admin.firestore();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      accessType: "offline",
      prompt: "consent",
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        console.log(refreshToken);

        // Use profile.id for Firestore document path
        const userDoc = await db.collection("Users").doc(profile.id).get();

        if (userDoc.exists) {
          // User exists, retrieve user data and add profile.id to it
          const userData = userDoc.data();

          if (userData.refreshT != refreshToken) {
            db.collection("Users").doc(profile.id).update({
              refreshT: refreshToken,
            });
          }
          userData.id = profile.id; // Add the id to the user data object
          return done(null, userData);
        } else {
          // User does not exist, create a new user
          const newUser = {
            id: profile.id, // Explicitly add the profile.id to the new user data
            Email: profile.emails[0].value, // Store email as a field
            refreshT: refreshToken,
            Rules: {
              0: {
                action: "default",
                prompt: "default",
                type: "default",
              },
            },
            createdAt: new Date(), // Optional: add a timestamp
          };
          await db.collection("Users").doc(profile.id).set(newUser);
          return done(null, newUser); // Return the new user object
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize user to store user ID in session
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user); // Debugging log
  done(null, user.id); // Use the user's Google ID for serialization
});

// Deserialize user from session to retrieve user object
passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user with id:", id); // Debugging log
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

module.exports = passport;
