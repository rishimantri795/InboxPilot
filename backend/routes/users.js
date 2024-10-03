const express = require("express");
const admin = require("../api/firebase.js"); // Import the `admin` object from firebase.js

const router = express.Router();

const db = admin.firestore();

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
