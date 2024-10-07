// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;

// const db = require("./firebase.js");

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: process.env.GOOGLE_CALLBACK_URL,
//     },
//     function (accessToken, refreshToken, profile, done) {
//       db.collection("Users")
//         .doc(profile.id)
//         .set({
//           name: profile.displayName,
//           email: profile.emails[0].value,
//           photo: profile.photos[0].value,
//         })
//         .then(() => {
//           return done(null, profile);
//         })
//         .catch((err) => {
//           return done(err);
//         });
//     }
//   )
// );
