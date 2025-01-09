const passport = require("passport");
require("./passport");
require("dotenv").config(); // loads env vars

// ensures that only authenticated users can access certain routes
function auth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("http://localhost:3000");
  }
}
module.exports = auth;
