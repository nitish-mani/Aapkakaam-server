const mongoose = require("mongoose");
const { Schema } = mongoose;

const shareSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
  status: {type:String,default:'pending'},
  phoneNo: Number,
  shareDate: Date,
});

module.exports = mongoose.model("Share", shareSchema);
