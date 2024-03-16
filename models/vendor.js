const mongoose = require("mongoose");
const { Schema } = mongoose;

const vendorSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  otpForPhoneNo: Number,
  verifyPhoneNo: { type: Boolean, default: false },
  email: { type: String, required: true },
  otpForEmail: Number,
  verifyEmail: { type: Boolean, default: false },
  password: { type: String, required: true },
  type: { type: String, required: true },
  address: [],
  bookings: [],
  share: [],
  wageRate: Number,
  rating: Number,
  ratingCount: Number,
  gender: { type: String },
  pincode: { type: String },
  accountCreatedOn: { type: String },
  balance: { type: Number, default: 30 },
});

module.exports = mongoose.model("Vendor", vendorSchema);

vendorSchema.index({ phoneNo: 1, email: 1 });
