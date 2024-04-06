const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");
const vendor_controller = require("../controller/vendor");

const uploads = require("../controller/uploads");

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

router.put("/uploads/:category/:id", is_vendor, uploads.uploads);
router.get("/getUploads/:category/:id", is_vendor, uploads.getUploads);

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
  "/getBookings/:vendorId/:month/:year",
  is_vendor,
  vendor_controller.vendor_controller_getBookings
);

router.get(
  "/getOrders/:vendorId",
  is_vendor,
  vendor_controller.vendor_controller_getOrders
);
router.get(
  "/getShare/:vendorId/:skip",
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
  "/getAll/:type/:pincode/:bookingDate/:page/:minRating/:minWageRate",
  is_user,
  vendor_controller.vendor_controller_getAll
);
router.get(
  "/getAllV/:type/:pincode/:bookingDate/:page/:minRating/:minWageRate",
  is_vendor,
  vendor_controller.vendor_controller_getAll
);
router.get(
  "/getOne/:vendorId",
  is_user,
  vendor_controller.vendor_controller_getOne
);

module.exports = router;
