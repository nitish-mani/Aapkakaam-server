// routes/payment.js
const express = require("express");
const { create_order, payment_verification } = require("../controller/payment");
const router = express.Router();

router.post("/create-order", create_order);
router.post("/verify-payment", payment_verification);

module.exports = router;
