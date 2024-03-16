const mongoose = require("mongoose");
const { Schema } = mongoose;

const bookingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
  bookingDate: String,
  bookingTime: Number,
  cancelTime: Number,
  type: String,
  pincode: String,
  bookedOn: String,
  cancelOrder: Boolean,
  orderCompleted: Boolean,
  rating: Number,
  ratingPermission:{type:Boolean,default:false}
});

module.exports = mongoose.model("Bookings", bookingSchema);

bookingSchema.index({ userId: 1 });
