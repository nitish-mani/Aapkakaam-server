const express = require("express");

const router = express.Router();

const is_admin = require("../middleware/is_admin");

const employee_auth = require("../auth/employee_auth");
const admin_auth = require("../auth/admin_auth");

router.post("/signup/employee", is_admin, employee_auth.signup);

router.post("/signup", admin_auth.signup);
router.post("/login", admin_auth.login);


module.exports = router;
