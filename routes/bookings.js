const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");
const is_employee = require("../middleware/is_employee");

const bookings_controller = require("../controller/bookings");

router.post("/postToBookingsU",is_user, bookings_controller.bookings_controller_post);
router.post("/postToBookingsV",is_vendor, bookings_controller.bookings_controller_post);

router.get("/getOrdersU/:userId",is_user, bookings_controller.bookings_controller_get);
router.get("/getOrdersV/:userId",is_vendor, bookings_controller.bookings_controller_get);

module.exports = router;
