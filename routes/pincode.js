const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");

const pincode_controller = require("../controller/pincode");

router.post("/getU", pincode_controller.pincode_controller);
router.post("/getV", pincode_controller.pincode_controller);

module.exports = router;
