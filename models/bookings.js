const mongoose = require("mongoose");
const { Schema } = mongoose;

const bookingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
  type: { type: String, index: true }, // e.g., plumber, electrician
  pincode: { type: String, index: true },

  bookingDate: String,
  bookingTime: Number,
  cancelTime: Number,
  bookedOn: { type: Date, default: Date.now },

  cancelOrder: { type: Boolean, default: false },
  orderCompleted: { type: Boolean, default: false },

  rating: Number,
  ratingPermission: { type: Boolean, default: false },

  isServed: { type: Boolean, default: false }, // Vendor was shown to user
  isBooked: { type: Boolean, default: false },

  name: String,
  pincode: Number,
  phoneNo: Number,
  vill: String,
  post: String,
  dist: String,
});

module.exports = mongoose.model("Bookings", bookingSchema);
