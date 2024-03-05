const mongoose = require("mongoose");
const { Schema } = mongoose;

const employeeSchema = new Schema({
  name: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  address: [],
  share: [],
  gender: { type: String },
  balance: { type: Number, default: 30 },
});

module.exports = mongoose.model("Employee", employeeSchema);
