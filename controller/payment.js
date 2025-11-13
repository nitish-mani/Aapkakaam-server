const User = require("../models/user");
const Vendor = require("../models/vendor");
const Transaction = require("../models/transaction");
const crypto = require("crypto");

require("dotenv").config();
const razorpay = require("../controller/razorpay");

const create_order = async (req, res) => {
  const { amount, currency, receipt } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Order creation failed" });
  }
};

const payment_verification = async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    vendorId,
    balance,
    discountPercent,
  } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    // Save payment success in DB
    if (vendorId != null) {
      const transaction = new Transaction({
        vendorId,
        amount: balance,
        discount: discountPercent,
      });
      const result = await transaction.save();

      Vendor.findByIdAndUpdate(
        vendorId,
        {
          $inc: {
            balance: balance,
            transactionCount: 1,
            totalDiscount: discountPercent,
          },
        },
        { new: true }
      )

        .then((result) => {
          if (!result) {
            const error = new Error("Could not find Vendor.");
            error.statusCode = 404;
            throw error;
          }
          loadedVendor = result;
          res.json({
            success: true,
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            balance: loadedVendor.balance,
          });
        })
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
    } else if (userId != null) {
      const transaction = new Transaction({
        userId,
        amount: balance,
        discount: discountPercent,
      });
      const result = await transaction.save();

      User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            balance: balance,
            transactionCount: 1,
            totalDiscount: discountPercent,
          },
        },
        { new: true }
      )

        .then((result) => {
          if (!result) {
            const error = new Error("Could not find User.");
            error.statusCode = 404;
            throw error;
          }
          loadedUser = result;
          res.json({
            success: true,
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            balance: loadedUser.balance,
          });
        })
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
    }
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
};

exports.create_order = create_order;
exports.payment_verification = payment_verification;
