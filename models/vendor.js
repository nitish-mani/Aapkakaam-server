const mongoose = require("mongoose");
const { Schema } = mongoose;

const vendorSchema = new Schema(
  {
    name: { type: String, required: true },
    phoneNo: { type: Number, required: true, index: true },
    verifyPhoneNo: { type: Boolean, default: false },
    email: { type: String, default: "", index: true },
    verifyEmail: { type: Boolean, default: false },
    password: { type: String, required: true },

    type: { type: String, required: true, index: true },
    validPhoneNoId: String,
    validEmailId: String,
    imgURL: String,

    address: [Object], // lightweight array (small number of entries)
    shareBy: { type: String },

    pending: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    canceled: { type: Number, default: 0 },
    wageRate: { type: Number, default: 0 },
    wageRateType: { type: String },
    earning: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },

    pendingVendor: { type: Number, default: 0 },
    completedVendor: { type: Number, default: 0 },
    canceledVendor: { type: Number, default: 0 },

    pendingShareBy: { type: Number, default: 0 },
    completedShareBy: { type: Number, default: 0 },
    canceledShareBy: { type: Number, default: 0 },

    rating: { type: Number, default: 4 },
    ratingCount: { type: Number, default: 1 },
    gender: String,

    pincode: { type: String, index: true },
    accountCreatedOn: { type: Date, default: Date.now },
    cd: { type: String },

    bonusAmount: { type: Number, default: 150 },
    balance: { type: Number, default: 0 },

    fcmToken: String,
    agreedToTnCnP: { type: Boolean, default: false },
    lastShownContext: {
      type: String,
      default: null,
    },

    // stats for external collections
    bookingCount: { type: Number, default: 0 },
    bookingCountVendor: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    presentDate: { type: Date },

    userShownContext: {
      type: Map,
      of: String,
      default: {},
    },
    lastShownContext: {
      type: String,
      default: null,
    },
  },
  { timestamps: true } // adds createdAt, updatedAt
);

// indexes

module.exports = mongoose.model("Vendor", vendorSchema);
