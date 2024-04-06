const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");
const is_employee = require("../middleware/is_employee");

const bookings_controller = require("../controller/bookings");

router.post(
  "/postToBookingsU",
  is_user,
  bookings_controller.bookings_controller_postU
);
router.post(
  "/postToBookingsV",
  is_vendor,
  bookings_controller.bookings_controller_postV
);

router.get(
  "/getOrdersU/:userId/:pageNo",
  is_user,
  bookings_controller.bookings_controller_get
);
router.get(
  "/getOrdersV/:userId/:pageNo",
  is_vendor,
  bookings_controller.bookings_controller_get
);

router.patch(
  "/cancelOrderU",
  is_user,
  bookings_controller.bookings_controller_cancelU
);
router.patch(
  "/cancelOrderV",
  is_vendor,
  bookings_controller.bookings_controller_cancelV
);

router.patch(
  "/orderCompletedU",
  is_user,
  bookings_controller.bookings_controller_completeU
);
router.patch(
  "/orderCompletedV",
  is_vendor,
  bookings_controller.bookings_controller_completeV
);

router.patch(
  "/ratingU",
  is_user,
  bookings_controller.bookings_controller_ratingU
);
router.patch(
  "/ratingV",
  is_vendor,
  bookings_controller.bookings_controller_ratingV
);

router.patch(
  "/ratingPermission",
  is_vendor,
  bookings_controller.bookings_controller_ratingPermission
);

module.exports = router;
