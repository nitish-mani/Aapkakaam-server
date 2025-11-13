const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
  amount: { type: Number },
  discount: { type: Number },
  transactionDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
