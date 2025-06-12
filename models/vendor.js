const mongoose = require("mongoose");
const { Schema } = mongoose;

const vendorSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  verifyPhoneNo: { type: Boolean, default: false },
  email: { type: String, default: "" },
  verifyEmail: { type: Boolean, default: false },
  password: { type: String, required: true },
  type: { type: String, required: true },
  validPhoneNoId: { type: String },
  validEmailId: { type: String },
  imgURL: { type: String },
  address: [],
  bookings: [],
  share: [],
  wageRate: Number,
  rating: { type: Number, default: 4 },
  ratingCount: { type: Number, default: 1 },
  gender: { type: String },
  pincode: { type: String },
  accountCreatedOn: { type: String },
  bonusAmount: { type: Number, default: 150 },
  balance: { type: Number, default: 150 },
  fcmToken: { type: String },
  agreedToTnCnP: { type: Boolean, default: false },
});

module.exports = mongoose.model("Vendor", vendorSchema);

vendorSchema.index({ phoneNo: 1, email: 1 });
