const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  verifyPhoneNo: { type: Boolean, default: false },
  email: { type: String, required: true },
  verifyEmail: { type: Boolean, default: false },
  password: { type: String, required: true },
  gender: { type: String },
});

module.exports = mongoose.model("Admin", adminSchema);
