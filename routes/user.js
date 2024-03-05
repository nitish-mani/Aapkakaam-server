const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");
const user_controller = require("../controller/user");

const user_auth = require("../auth/user_auth");

/////////////////////
//// for user //////
////////////////////

router.post("/signup", user_auth.signup);
router.post("/login", user_auth.login);

router.patch("/edit/name", is_user, user_controller.user_controller_patch_name);
router.patch(
  "/edit/email",
  is_user,
  user_controller.user_controller_patch_email
);
router.patch(
  "/edit/phoneNo",
  is_user,
  user_controller.user_controller_patch_phoneNo
);
router.patch(
  "/update/address",
  is_user,
  user_controller.user_controller_patch_address
);

router.get(
  "/getOrders/:userId",
  is_user,
  user_controller.user_controller_getOrders
);
router.get(
  "/getShare/:userId",
  is_user,
  user_controller.user_controller_getShare
);

router.get(
  "/getUserByUser/:userId",
  is_user,
  user_controller.user_controller_getUser
);

///////////////////////
//// for vendor //////
/////////////////////

router.get("/getOne", is_vendor, user_controller.user_controller_getOne);

module.exports = router;
