const mongoose = require("mongoose");
const { Schema } = mongoose;

const bookingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
  bookingDate: String,
  type: String,
  pincode: String,
  bookedOn: String,
});

module.exports = mongoose.model("Bookings", bookingSchema);

bookingSchema.index({ userId: 1 });
