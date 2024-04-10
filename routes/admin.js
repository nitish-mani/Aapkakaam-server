const express = require("express");

const router = express.Router();

const is_admin = require("../middleware/is_admin");

const admin_auth = require("../auth/admin_auth");
const admin_controller = require("../controller/admin");

router.post(
  "/emailVerification",
  admin_controller.admin_controller_verify_email
);
router.post("/emailOtpVerification", admin_controller.admin_controller_otpE);

router.post(
  "/phoneVerification",
  admin_controller.admin_controller_verify_phoneNo
);
router.post("/otpVerification", admin_controller.admin_controller_otp);

router.post("/signup", admin_auth.signup);
router.post("/login", admin_auth.login);

module.exports = router;
