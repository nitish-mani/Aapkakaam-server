const mongoose = require("mongoose");
const { Schema } = mongoose;

const vendorSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  verifyPhoneNo: { type: Boolean, default: false },
  email: { type: String, required: true },
  verifyEmail: { type: Boolean, default: false },
  password: { type: String, required: true },
  type: { type: String, required: true },
  address: [],
  bookings: [],
  share: [],
  gender: { type: String },
  pincode: { type: String },
  accountCreatedOn: { type: String },
  balance: { type: Number, default: 30 },
});

module.exports = mongoose.model("Vendor", vendorSchema);