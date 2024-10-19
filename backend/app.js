const express = require("express");
const path = require("path");
const app = express();
const users = require("./routes/users");
const admin = require("./api/firebase.js"); // Import Firebase Admin from firebase.js
require("dotenv").config(); // For environment variables
const cors = require("cors");
const passport = require("passport");
require("./middleware/passport.js");
const session = require("express-session");

app.use(express.json());

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  session({
    secret: "happy",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Initialize Firebase Admin
// const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT ||
//   "../backend/API/inboxpilot-c4098-firebase-adminsdk-8j22p-febada5cab.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// Routes
// app.use(passport.initialize());

app.use("/api/users", users);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Serve static files if needed
app.use(express.static(path.join(__dirname, "public")));

// Start the server
const port = process.env.PORT || 3010;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
