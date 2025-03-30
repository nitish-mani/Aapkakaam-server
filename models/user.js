const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  otpForPhoneNo: Number,
  verifyPhoneNo: { type: Boolean, default: false },
  email: { type: String, default: "" },
  otpForEmail: Number,
  verifyEmail: { type: Boolean, default: false },
  password: { type: String, required: true },
  validPhoneNoId: { type: String },
  validEmailId: { type: String },
  imgURL: String,
  address: [],
  share: [],
  gender: { type: String },
  pincode: { type: String },
  accountCreatedOn: { type: String },
  balance: { type: Number, default: 150 },
});

module.exports = mongoose.model("User", userSchema);

userSchema.index({ phoneNo: 1, email: 1 });
