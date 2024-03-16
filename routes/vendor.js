const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");
const vendor_controller = require("../controller/vendor");

const vendor_auth = require("../auth/vendor_auth");

/////////////////////
//// for vendor ////
////////////////////

router.post(
  "/emailVerification",
  vendor_controller.vendor_controller_verify_email
);
router.post("/emailOtpVerification", vendor_controller.vendor_controller_otpE);

router.post(
  "/phoneVerification",
  vendor_controller.vendor_controller_verify_phoneNo
);
router.post("/otpVerification", vendor_controller.vendor_controller_otp);

router.post("/signup", vendor_auth.signup);
router.post("/login", vendor_auth.login);

router.patch(
  "/edit/password",
  vendor_controller.vendor_controller_patch_password
);

router.patch(
  "/update/address",
  is_vendor,
  vendor_controller.vendor_controller_patch_address
);

router.patch(
  "/edit/name",
  is_vendor,
  vendor_controller.vendor_controller_patch_name
);
router.patch(
  "/edit/phoneNo",
  is_vendor,
  vendor_controller.vendor_controller_patch_phoneNo
);
router.patch(
  "/edit/email",
  is_vendor,
  vendor_controller.vendor_controller_patch_email
);

router.patch(
  "/wageRate",
  is_vendor,
  vendor_controller.vendor_controller_patch_wageRate
);

router.patch(
  "/bookNowV/:vendorId",
  is_vendor,
  vendor_controller.vendor_controller_bookNowV
);

router.get(
  "/getBookings/:vendorId",
  is_vendor,
  vendor_controller.vendor_controller_getBookings
);

router.get(
  "/getOrders/:vendorId",
  is_vendor,
  vendor_controller.vendor_controller_getOrders
);
router.get(
  "/getShare/:vendorId",
  is_vendor,
  vendor_controller.vendor_controller_getShare
);

router.get(
  "/getVendorByVendor/:vendorId",
  is_vendor,
  vendor_controller.vendor_controller_getVendor
);

/////////////////////
//// for user ///////
////////////////////

router.patch(
  "/bookNowU/:vendorId",
  is_user,
  vendor_controller.vendor_controller_bookNowU
);

router.get(
  "/getAll/:type/:pincode/:bookingDate",
  is_user,
  vendor_controller.vendor_controller_getAll
);
router.get(
  "/getAllV/:type/:pincode/:bookingDate",
  is_vendor,
  vendor_controller.vendor_controller_getAll
);
router.get(
  "/getOne/:vendorId",
  is_user,
  vendor_controller.vendor_controller_getOne
);

module.exports = router;
