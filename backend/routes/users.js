const express = require("express");
const admin = require("../api/firebase.js"); // Import the `admin` object from firebase.js

const router = express.Router();

const db = admin.firestore();

router.get("/auth", async (req, res) => {
  //   passport.authenticate("google", { scope: ["profile", "email"] })(req, res);
});

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

    // Generate a new user ID (you can also let Firestore generate it)
    const newUserRef = db.collection("Users").doc(uid); // This generates a new document reference

    // Create a new user document with the provided data
    await newUserRef.set({
      Email: decodedToken.email,
      Rules: {
        // Assuming you want to store the first rule as provided
        0: {
          action: "default",
          prompt: "defuault",
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

router.get("/auth/google/callback", async (req, res) => {
  //   passport.authenticate("google", {
  //     successRedirect: "/failure",
  //     failureRedirect: "/",
  //   })(req, res);
});

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

  if (!id) {
    res.status(400).send("Missing user id");
    return;
  }

  if (!req.body) {
    res.status(400).send("Missing user data");
    return;
  }

  let User = await db.collection("Users").doc(`${id}`);

  index = 0;
  try {
    User = await User.update({
      Rules: {
        [`${index}`]: {
          action: req.body.action,
          prompt: req.body.prompt,
          type: req.body.type,
        },
      },
    });
    res.status(200).send(User);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating user");
  }
});

router.delete("/", (req, res) => {});

router.get("/:id", (req, res) => {});

module.exports = router;
