const mongoose = require("mongoose");
const { Schema } = mongoose;

const transactionSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
  amount: { type: Number },
  discount: { type: Number },
  transactionDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
