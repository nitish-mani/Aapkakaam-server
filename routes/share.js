const express = require("express");

const router = express.Router();
const is_user = require("../middleware/is_user");
const is_vendor = require("../middleware/is_vendor");
const is_employee = require("../middleware/is_employee");

const share_controller = require("../controller/share");

router.post("/postU", is_user, share_controller.share_controller_post);
router.post("/postV", is_vendor, share_controller.share_controller_post);
router.post("/postE", is_employee, share_controller.share_controller_post);

router.get("/getU", is_user, share_controller.share_controller_get);
router.get("/getV", is_vendor, share_controller.share_controller_get);
router.get("/getE", is_employee, share_controller.share_controller_get);

module.exports = router;
