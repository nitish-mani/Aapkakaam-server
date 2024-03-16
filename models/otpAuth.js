const mongoose = require("mongoose");
const { Schema } = mongoose;

const otpAuthSchema = new Schema({
  otp: String,
  verifiedEmail: { type: Boolean, default: false },
  verifiedNumber: { type: Boolean, default: false },
  createdAt: { type: Date, expires: 600, default: Date.now },
});

module.exports = mongoose.model("OtpAuth", otpAuthSchema);
