const express = require("express");

const router = express.Router();

const is_employee = require("../middleware/is_employee");

const employee_controller = require("../controller/employee");

const employee_auth = require("../auth/employee_auth");

router.post("/signup", employee_auth.signup);
router.post("/login", employee_auth.login);

router.get(
  "/get/:type",
  is_employee,
  employee_controller.employee_controller_get
);

module.exports = router;
