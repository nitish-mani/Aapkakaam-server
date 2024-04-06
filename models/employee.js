const mongoose = require("mongoose");
const { Schema } = mongoose;

const employeeSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  verifyPhoneNo: { type: Boolean, default: false },
  email: { type: String, required: true },
  verifyEmail: { type: Boolean, default: false },
  password: { type: String, required: true },
  profilePic: String,
  address: [],
  share: [],
  ratings: [],
  gender: { type: String },
  balance: { type: Number, default: 30 },
});

module.exports = mongoose.model("Employee", employeeSchema);
