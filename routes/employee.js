const express = require("express");

const router = express.Router();

const is_employee = require("../middleware/is_employee");

const employee_controller = require("../controller/employee");

const employee_auth = require("../auth/employee_auth");

router.post(
  "/emailVerification",
  employee_controller.employee_controller_verify_email
);
router.post(
  "/emailOtpVerification",
  employee_controller.employee_controller_otpE
);

router.post(
  "/phoneVerification",
  employee_controller.employee_controller_verify_phoneNo
);
router.post("/otpVerification", employee_controller.employee_controller_otp);

router.post("/login", employee_auth.login);
router.post("/signup", employee_auth.signup);

router.patch(
  "/edit/password",
  employee_controller.employee_controller_patch_password
);

router.patch(
  "/edit/name",
  is_employee,
  employee_controller.employee_controller_patch_name
);
router.patch(
  "/edit/email",
  is_employee,
  employee_controller.employee_controller_patch_email
);
router.patch(
  "/edit/phoneNo",
  is_employee,
  employee_controller.employee_controller_patch_phoneNo
);
router.patch(
  "/update/address",
  is_employee,
  employee_controller.employee_controller_patch_address
);

router.get(
  "/getShare/:employeeId/:date/:month/:year",
  is_employee,
  employee_controller.employee_controller_getShare
);

router.get(
  "/getAttendence/:employeeId/:month/:year",
  is_employee,
  employee_controller.employee_controller_getAttendence
);

router.get(
  "/getemployeeByemployee/:employeeId",
  is_employee,
  employee_controller.employee_controller_getEmployee
);

module.exports = router;
