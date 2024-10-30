const passport = require("passport"); 
require("../middleware/passport");
const jwt = require("jsonwebtoken");
require("dotenv").config();

function auth(req, res, next) {
    if (req.isAuthenticated()) {
        return next;
    } else {
        res.redirect('/http://localhost:3000')
    }


}

export default auth;