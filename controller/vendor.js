const User = require("../models/user");
const Vendor = require("../models/vendor");
const Bookings = require("../models/bookings");
const OtpAuth = require("../models/otpAuth");
const Share = require("../models/share");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { sendNotification } = require("./singalMessaging");
const nodemailer = require("nodemailer");
const { default: axios } = require("axios");
const mongoose = require("mongoose");
const Attendance = require("../models/attendance");

require("dotenv").config();

const otp = () => Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

////////////////////////////////////
///// for Email Verification //////
//////////////////////////////////

exports.vendor_controller_verify_email = async (req, res, next) => {
  try {
    const otpE = otp();
    const email = req.body.email;
    const otpId = req.body.otpId;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otpRecord = new OtpAuth({
      otp: otpE,
    });

    const result = await otpRecord.save();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || "otp-verification@aapkakaam.com",
        pass: process.env.SMTP_PASS || "jwonqzmtwkmlideu",
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || "otp-verification@aapkakaam.com",
      to: email,
      subject: "OTP Verification",
      text: `Your OTP for email verification is: ${otpE}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res
          .status(500)
          .json({ message: "Failed to send OTP", error: error.message });
      } else {
        res.status(200).json({
          message: "OTP sent on Email",
          verified: true,
          otpId: result._id,
        });
      }
    });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.vendor_controller_otpE = async (req, res, next) => {
  try {
    const userOtp = req.body.emailOtp;
    const otpId = req.body.otpId;

    if (!userOtp || !otpId) {
      return res.status(400).json({ message: "OTP and OTP ID are required" });
    }

    const result = await OtpAuth.findById(otpId);

    if (!result) {
      return res.status(404).json({ message: "Invalid OTP request" });
    }

    // Check if OTP is expired (10 minutes)
    const isExpired = Date.now() - result.createdAt > 10 * 60 * 1000;
    if (isExpired) {
      await OtpAuth.findByIdAndDelete(otpId);
      return res.status(410).json({ message: "OTP has expired" });
    }

    if (result.otp == userOtp) {
      await OtpAuth.findByIdAndUpdate(
        otpId,
        { verifiedEmail: true },
        { new: true }
      );
      res.json({ message: "OTP verified", verify: true });
    } else {
      res.status(400).json({ message: "invalid OTP", verify: false });
    }
  } catch (err) {
    console.error("Email OTP verification error:", err);
    res.status(404).json({ message: "Not authorized" });
  }
};

////////////////////////////////////////////
///// for Mobile Number Verification //////
//////////////////////////////////////////

exports.vendor_controller_verify_phoneNo = async (req, res, next) => {
  try {
    const otpM = otp();
    const phoneNo = req.body.phoneNo;
    const otpId = req.body.otpId;

    if (!phoneNo) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    const existingUser = await User.findOne({ phoneNo });
    const existingVendor = await Vendor.findOne({ phoneNo });
    if (existingVendor || existingUser) {
      return res.status(409).json({ message: "Mobile number already exists!" });
    }
    const otpRecord = new OtpAuth({
      otp: otpM,
    });

    const result = await otpRecord.save();

    const smsResponse = await axios.get(
      `${process.env.FAST2SMS}variables_values=${otpM}&flash=0&numbers=${phoneNo}&schedule_time=`
    );

    res.status(200).json({
      message: "OTP sent successfully",
      verified: true,
      otpId: result._id,
    });
  } catch (err) {
    console.error("Phone verification error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.vendor_controller_otp = async (req, res, next) => {
  try {
    const userOtp = req.body.otp;
    const otpId = req.body.otpId;

    if (!userOtp || !otpId) {
      return res.status(400).json({ message: "OTP and OTP ID are required" });
    }

    const result = await OtpAuth.findById(otpId);

    if (!result) {
      return res.status(404).json({ message: "Invalid OTP request" });
    }

    // Check if OTP is expired (10 minutes)
    const isExpired = Date.now() - result.createdAt > 10 * 60 * 1000;
    if (isExpired) {
      await OtpAuth.findByIdAndDelete(otpId);
      return res.status(410).json({ message: "OTP has expired" });
    }

    if (result.otp == userOtp) {
      await OtpAuth.findByIdAndUpdate(
        otpId,
        { verifiedNumber: true },
        { new: true }
      );
      res.json({ message: "OTP verified", verify: true });
    } else {
      res.status(400).json({ message: "invalid OTP", verify: false });
    }
  } catch (err) {
    console.error("Phone OTP verification error:", err);
    res.status(404).json({ message: "Not authorized" });
  }
};

///////////////////////////////////////
//// for updating vendor password //////
///////////////////////////////////////

exports.vendor_controller_patch_password = async (req, res, next) => {
  try {
    const password = req.body.password;
    const email = req.body.email;
    const otpId = req.body.otpId;

    if (!password || !email || !otpId) {
      return res
        .status(400)
        .json({ message: "Password, email, and OTP ID are required" });
    }

    if (password.length < 6) {
      return res.status(401).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const otpDoc = await OtpAuth.findById(otpId);
    if (!otpDoc?.verifiedEmail) {
      return res
        .status(404)
        .json({ message: "Not authorized or not verified vendor." });
    }

    const hashPass = await bcrypt.hash(password, 12);
    const updatedVendor = await Vendor.findOneAndUpdate(
      { email: email },
      { password: hashPass },
      { new: true }
    );

    if (!updatedVendor) {
      return res
        .status(404)
        .json({ message: "Vendor with this Email Not found" });
    }

    res.status(201).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////////
//// for updating vendor address //////
///////////////////////////////////////

exports.vendor_controller_patch_address = async (req, res, next) => {
  try {
    const vendorId = req.body.vendorId;
    const vill = req.body.vill;
    const post = req.body.post;
    const dist = req.body.dist;
    const state = req.body.state;
    const pincode = req.body.pincode;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const address = { vill, post, dist, state, pincode };

    const loadedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        address: [address],
        pincode: pincode,
      },
      { new: true }
    );

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      address: loadedVendor.address,
      message: "Address Updated Successfully",
    });
  } catch (err) {
    console.error("Address update error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////
///// for modifing vendor name //////
//////////////////////////////////////

exports.vendor_controller_patch_name = async (req, res, next) => {
  try {
    const name = req.body.name;
    const vendorId = req.body.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const loadedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { name },
      { new: true }
    );

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      name: loadedVendor.name,
      message: "Name Updated Successfully",
    });
  } catch (err) {
    console.error("Name update error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////
///// for modifing vendor fcm token //////
//////////////////////////////////////

exports.vendor_controller_patch_fcmToken = async (req, res, next) => {
  try {
    const fcmToken = req.body.fcmToken;
    const vendorId = req.body.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const loadedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { fcmToken },
      { new: true }
    );

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      fcmToken: loadedVendor.fcmToken,
      message: "fcmToken Updated Successfully",
    });
  } catch (err) {
    console.error("FCM token update error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////
///// for modifing vendor phoneNo //////
//////////////////////////////////////

exports.vendor_controller_patch_phoneNo = async (req, res, next) => {
  try {
    const phoneNo = req.body.phoneNo;
    const vendorId = req.body.vendorId;
    const otpId = req.body.otpId;

    if (!vendorId || !phoneNo || !otpId) {
      return res
        .status(400)
        .json({ message: "Vendor ID, phone number, and OTP ID are required" });
    }

    const result = await OtpAuth.findById(otpId);
    if (!result?.verifiedNumber) {
      return res.status(404).json({ message: "Not Verified Vendor" });
    }

    // Check if phone number is already used
    const existingVendor = await Vendor.findOne({
      phoneNo,
      _id: { $ne: vendorId },
    });
    if (existingVendor) {
      return res.status(401).json({ message: "Phone number already exists!" });
    }

    const loadedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { phoneNo },
      { new: true }
    );

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      phoneNo: loadedVendor.phoneNo,
      message: "Phone Number Updated Successfully",
    });
  } catch (err) {
    console.error("Phone number update error:", err);
    res.status(404).json({ message: "Not Authorized" });
  }
};

///////////////////////////////////////
///// for modifing vendor email //////
//////////////////////////////////////

exports.vendor_controller_patch_email = async (req, res, next) => {
  try {
    const email = req.body.email;
    const vendorId = req.body.vendorId;
    const otpId = req.body.otpId;

    if (!vendorId || !email || !otpId) {
      return res
        .status(400)
        .json({ message: "Vendor ID, email, and OTP ID are required" });
    }

    const result = await OtpAuth.findById(otpId);
    if (!result?.verifiedEmail) {
      return res.status(404).json({ message: "Not Verified Vendor" });
    }

    // Check if email already exists
    const existingVendor = await Vendor.findOne({
      email: email,
      _id: { $ne: vendorId },
    });
    if (existingVendor?.email) {
      return res.status(401).json({ message: "Email already exist !" });
    }

    const loadedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { email },
      { new: true }
    );

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      email: loadedVendor.email,
      message: "Email Updated Successfully",
    });
  } catch (err) {
    console.error("Email update error:", err);
    res.status(404).json({ message: "Not Authorized" });
  }
};

///////////////////////////////////////////
///// for modifing vendor wage rate //////
/////////////////////////////////////////

exports.vendor_controller_patch_wageRate = async (req, res, next) => {
  try {
    const wageRate = req.body.wageRate;
    const wageRateType = req.body.wageRateType;
    const vendorId = req.body.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const loadedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { wageRate, wageRateType },
      { new: true }
    );

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      wageRate: loadedVendor.wageRate,
      wageRateType: loadedVendor.wageRateType,
      message: "Wage Rate Updated Successfully",
    });
  } catch (err) {
    console.error("Wage rate update error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////
///// for getting vendor orders //////
//////////////////////////////////////

exports.vendor_controller_getOrders = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const bookings = await Bookings.find({ vendorId: vendorId })

      .sort({ bookedOn: -1 })
      .lean();

    res.status(200).json({ orders: bookings });
  } catch (err) {
    console.error("Get orders error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////
///// for getting vendor share //////
//////////////////////////////////////

exports.vendor_controller_getShare = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    let skip = parseInt(req.params.skip) || 0;
    const limit = 12;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const total = await Share.countDocuments({ vendorId: vendorId });
    if (skip >= total) {
      skip = 0; // Reset to first page or handle as needed
      // OR: skip = Math.max(0, total - limit); // Go to last page
    }

    // Also ensure skip doesn't cause empty results when near the end
    if (skip + limit > total && skip > 0) {
      skip = Math.max(0, total - limit);
    }
    const shares = await Share.find({ vendorId: vendorId })
      .sort({ shareDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(shares, total);
    res.status(200).json({ share: shares, total: total });
  } catch (err) {
    console.error("Get share error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////
//// for bookings by vendor //////
/////////////////////////////////

exports.vendor_controller_bookNowV = async (req, res, next) => {
  try {
    const {
      bookingId,
      vendorUser,
      name,
      phoneNo,
      vill,
      post,
      dist,
      pincode,
      date,
      month,
      year,
      isSelfBooking,
    } = req.body;
    const vendorId = req.params.vendorId;

    if (!vendorId || !vendorUser || !name || !phoneNo) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const bookingForDate = `${date}/${month + 1}/${year}`;
    const bookingTime = Date.now();
    const bookingCost = 30;

    const vendor = await Vendor.findById(vendorId).select(
      "balance fcmToken cd shareBy commission"
    );
    const vendorUserDoc = await Vendor.findById(vendorUser).select(
      "bonusAmount cd shareBy"
    );

    if (!vendor || !vendorUserDoc) {
      return res
        .status(404)
        .json({ message: "Vendor or vendor user not found." });
    }

    if (!isSelfBooking) {
      if (
        vendor.balance < vendor.commission ||
        vendorUserDoc.bonusAmount < bookingCost
      ) {
        return res.status(400).json({ message: "Insufficient balance." });
      }
    }

    // Create booking in Bookings collection
    const booking = new Bookings({
      bookingId,
      vendorId,
      userId: vendorUser, // Using vendorUser as userId for vendor bookings
      type: vendor.type,
      pincode,
      bookingDate: bookingForDate,
      bookingTime,
      bookedOn: new Date(),
      cancelOrder: false,
      orderCompleted: false,
    });

    await booking.save();

    // Update vendor balance
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $inc: {
          balance: isSelfBooking ? 0 : -vendor.commission,
          pending: 1,
        },
      },
      { new: true }
    );

    // Update vendor user bonus
    const updatedVendorUser = await Vendor.findByIdAndUpdate(
      vendorUser,
      { $inc: { bonusAmount: isSelfBooking ? 0 : -bookingCost } },
      { new: true }
    );

    // Handle referral updates using Share model
    await handleReferralUpdates(vendorUserDoc, "vendor");
    await handleReferralUpdates(vendor, "vendor");

    // Send notifications
    try {
      await axios.get(
        `${
          process.env.FAST2SMSBOOKING
        }variables_values=${name.toUpperCase()}%7C${bookingForDate}%7C&flash=1&numbers=${phoneNo}&schedule_time=`
      );

      sendNotification(
        vendor.fcmToken,
        `...You are Booked...`,
        bookingId,
        `Booking Done by ${name.toUpperCase()} on ${bookingForDate}`,
        "booking",
        month.toString(),
        year.toString()
      );
    } catch (err) {
      console.error("Notification failed", err);
    }

    res.status(200).json({
      message: "Booking Done..!",
      bonusAmount: updatedVendorUser.bonusAmount,
    });
  } catch (err) {
    console.error("BookNowV error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////
//// for bookings by user //////
/////////////////////////////////

exports.vendor_controller_bookNowU = async (req, res, next) => {
  try {
    const {
      bookingId,
      userId,
      name,
      phoneNo,
      vill,
      post,
      dist,
      pincode,
      date,
      month,
      year,
    } = req.body;
    const vendorId = req.params.vendorId;

    if (!vendorId || !userId || !name || !phoneNo) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const bookingForDate = `${date}/${month + 1}/${year}`;
    const bookingTime = Date.now();
    const bookingCost = 30;

    const vendor = await Vendor.findById(vendorId).select(
      "balance fcmToken cd shareBy commission"
    );
    const user = await User.findById(userId).select("bonusAmount cd shareBy");

    if (!vendor || !user) {
      return res.status(404).json({ message: "Vendor or user not found." });
    }

    if (vendor.balance < vendor.commission || user.bonusAmount < bookingCost) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    // Create booking in Bookings collection
    const booking = new Bookings({
      bookingId,
      vendorId,
      userId,
      type: vendor.type,
      pincode,
      bookingDate: bookingForDate,
      bookingTime,
      bookedOn: new Date(),
      cancelOrder: false,
      orderCompleted: false,
    });

    await booking.save();

    // Update vendor balance
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $inc: {
          balance: -vendor.commission,
          pending: 1,
        },
      },
      { new: true }
    );

    // Update user bonus
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { bonusAmount: -bookingCost } },
      { new: true }
    );

    // Handle referral updates using Share model
    await handleReferralUpdates(user, "user");
    await handleReferralUpdates(vendor, "vendor");

    // Send notifications
    try {
      await axios.get(
        `${
          process.env.FAST2SMSBOOKING
        }variables_values=${name.toUpperCase()}%7C${bookingForDate}%7C&flash=1&numbers=${phoneNo}&schedule_time=`
      );

      sendNotification(
        vendor.fcmToken,
        `...You are Booked...`,
        bookingId,
        `Booking Done by ${name.toUpperCase()} on ${bookingForDate}`,
        "booking",
        month.toString(),
        year.toString()
      );
    } catch (err) {
      console.error("Notification failed", err);
    }

    res.status(200).json({
      message: "Booking Done..!",
      bonusAmount: updatedUser.bonusAmount,
    });
  } catch (err) {
    console.error("BookNowU error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Helper function for referral updates
async function handleReferralUpdates(entity, entityType) {
  if (entity.shareBy && entity.cd) {
    let referrerModel;
    switch (entity.cd) {
      case "user":
        referrerModel = User;
        break;
      case "vendor":
        referrerModel = Vendor;
        break;
      default:
        return;
    }

    await referrerModel.findByIdAndUpdate(
      entity.shareBy,
      { $inc: { pending: 1 } },
      { new: true }
    );
  }
}

//////////////////////////////////////
//// to get bookings by vendor //////
////////////////////////////////////

exports.vendor_controller_getBookings = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    // Month names used in string dates like "Wed Oct 22 2025"
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthStr = monthNames[month]; // e.g. month=10 → "Oct"
    const yearStr = year.toString();

    // Create regex patterns for both possible date formats
    const regexPatterns = new RegExp(
      `${monthStr}\\s+\\d{1,2}\\s+${yearStr}$`,
      "i"
    ); // "Wed Oct 22 2025"

    console.log(regexPatterns);
    // Find bookings matching any of the formats
    const bookings = await Bookings.find({
      vendorId: vendorId,
      $or: [{ bookingDate: { $regex: regexPatterns } }],
    })
      .populate("userId", "name phoneNo address")
      .sort({ bookedOn: -1 })
      .lean();

    const size = Buffer.byteLength(JSON.stringify(bookings));
    console.log("Response size:", size, "bytes");
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////////
///// for getting vendor by vendor //////
//////////////////////////////////////

exports.vendor_controller_getVendor = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const loadedVendor = await Vendor.findOne({ _id: vendorId })
      .select(
        "rating ratingCount balance bonusAmount earning pending completed canceled"
      )
      .lean();

    if (!loadedVendor) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.status(200).json({
      rating: loadedVendor.rating,
      ratingCount: loadedVendor.ratingCount,
      balance: loadedVendor.balance,
      bonusAmount: loadedVendor.bonusAmount,
      earning: loadedVendor.earning,
      stats: {
        pending: loadedVendor.pending,
        completed: loadedVendor.completed,
        canceled: loadedVendor.canceled,
      },
    });
  } catch (err) {
    console.error("Get vendor error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////////
//// for getting all vendor by user //////
//////////////////////////////////////////

// exports.vendor_controller_getAll = async (req, res, next) => {
//   try {
//     const type = req.params.type;
//     const pincode = req.params.pincode;
//     const bookingDate = req.params.bookingDate;
//     const page = parseInt(req.params.page) || 1;
//     const minRating = parseFloat(req.params.minRating) || 0;
//     const minWageRate = parseFloat(req.params.minWageRate) || 0;
//     const limit = 12;

//     if (!type || !pincode || !bookingDate) {
//       return res
//         .status(400)
//         .json({ message: "Type, pincode, and booking date are required" });
//     }

//     // Get vendorIds with bookings on the specified date
//     const bookedVendorIds = await Bookings.distinct("vendorId", {
//       type,
//       pincode,
//       bookingDate,
//       cancelOrder: { $ne: true },
//     });

//     const matchStage = {
//       type,
//       pincode,
//       balance: { $gte: 25 },
//       wageRate: { $exists: true, $gte: minWageRate },
//       rating: { $gte: minRating },
//     };

//     // Exclude booked vendors if any exist
//     if (bookedVendorIds.length > 0) {
//       matchStage._id = { $nin: bookedVendorIds };
//     }

//     const skip = (page - 1) * limit;

//     const [vendors, totalCount] = await Promise.all([
//       Vendor.find(matchStage)
//         .select(
//           "_id name type gender phoneNo rating ratingCount wageRate imgURL"
//         )
//         .skip(skip)
//         .limit(limit)
//         .lean(),

//       Vendor.countDocuments(matchStage),
//     ]);

//     // Format phone numbers for security
//     const formattedVendors = vendors.map((vendor) => ({
//       ...vendor,
//       phoneNo: vendor.phoneNo
//         ? vendor.phoneNo.toString().replace(/(\d{2})\d{6}(\d{2})/, "$1******$2")
//         : "",
//     }));

//     res.status(200).json({
//       total: totalCount,
//       vendors: formattedVendors,
//     });
//   } catch (err) {
//     console.error("Get all vendors error:", err);
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };

const JOB_COMMISSION = {
  labour: 30,
  mason: 50,
  electrician: 50,
  plumber: 50,
  "ac mechanic": 50,
  "fridge mechanic": 50,
  driver: 50,
  "home tutor": 50,
  "milk man": 50,
  parlour: 50,
  "menhandi maker": 50,
  "pundit ji": 50,
  carpenter: 50,
  "laptop repaire": 50,
  "washer man": 50,
  cook: 50,
  painter: 50,
  "car repaire": 50,
  "bike repaire": 30,
  "tiles fitter": 50,
  "four wheeler": 100,
  lights: 100,
  bus: 200,
  "tent house": 200,
  generator: 100,
  auto: 50,
  dj: 50,
  dhankutti: 50,
  "aata chakki": 50,
  "latrine tank cleaner": 100,
  "marriage hall": 500,
  shuttering: 100,
  waiter: 100,
  "marble fitter": 100,
  "e-riksha": 50,
  "pual cutter": 50,
  ro: 100,
  chaat: 100,
  "dulha rath": 100,
  "kirtan mandli": 100,
  "mini truck": 50,
  "fruit seller": 100,
  "paan wala": 100,
  "bhoonsa pual seller": 100,
};
function getCommission(jobType) {
  return JOB_COMMISSION[jobType] || 50; // Default commission if not found
}
exports.vendor_controller_getAvailableVendor = async (req, res, next) => {
  try {
    const type = req.params.type;
    const pincode = req.params.pincode;
    const bookingDate = req.params.bookingDate;
    const page = parseInt(req.params.page) || 1;
    const minRating = parseFloat(req.params.minRating) || 0;
    const minWageRate = parseFloat(req.params.minWageRate) || 0;
    const limit = 12;
    const commission = getCommission(type);
    if (!type || !pincode || !bookingDate) {
      return res
        .status(400)
        .json({ message: "Type, pincode, and booking date are required" });
    }

    // Get vendorIds with bookings on the specified date
    const bookedVendorIds = await Bookings.distinct("vendorId", {
      type,
      pincode,
      bookingDate,
      cancelOrder: { $ne: true },
    });

    const baseMatchStage = {
      type,
      pincode,
      balance: { $gte: commission },
      wageRate: { $exists: true, $gte: minWageRate },
      rating: { $gte: minRating },
    };

    // Exclude booked vendors
    if (bookedVendorIds.length > 0) {
      baseMatchStage._id = { $nin: bookedVendorIds };
    }

    const skip = (page - 1) * limit;
    const requestContext = `${type}-${pincode}-${bookingDate}`;

    // STRATEGY 1: Find and claim fresh vendors atomically
    const session = await Vendor.startSession();
    let vendors = [];
    let totalCount;

    try {
      await session.withTransaction(async () => {
        // Find fresh vendors and mark them as shown in one operation
        const freshVendors = await Vendor.find({
          ...baseMatchStage,
          $or: [
            { lastShownContext: { $ne: requestContext } },
            { lastShownContext: { $exists: false } },
          ],
        })
          .session(session)
          .limit(limit)
          .select(
            "_id name type gender phoneNo rating ratingCount wageRate imgURL"
          )
          .lean();

        if (freshVendors.length > 0) {
          // Mark these vendors as shown for this context
          await Vendor.updateMany(
            { _id: { $in: freshVendors.map((v) => v._id) } },
            { $set: { lastShownContext: requestContext } },
            { session }
          );

          vendors = freshVendors;
        }
      });
    } finally {
      await session.endSession();
    }

    // Get total count
    totalCount = await Vendor.countDocuments(baseMatchStage);

    // STRATEGY 2: If no fresh vendors, get shuffled available vendors
    if (vendors.length === 0) {
      const allAvailableVendors = await Vendor.find(baseMatchStage)
        .select(
          "_id name type gender phoneNo rating ratingCount wageRate imgURL"
        )
        .lean();

      totalCount = allAvailableVendors.length;

      if (allAvailableVendors.length > 0) {
        // Shuffle using Fisher-Yates algorithm
        const shuffledVendors = [...allAvailableVendors];
        for (let i = shuffledVendors.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledVendors[i], shuffledVendors[j]] = [
            shuffledVendors[j],
            shuffledVendors[i],
          ];
        }

        // Apply pagination
        vendors = shuffledVendors.slice(skip, skip + limit);
      }
    }

    // Format phone numbers for security
    const formattedVendors = vendors.map((vendor) => ({
      ...vendor,
      phoneNo: vendor.phoneNo
        ? vendor.phoneNo.toString().replace(/(\d{2})\d{6}(\d{2})/, "$1******$2")
        : "",
    }));

    // SEND RESPONSE
    res.status(200).json({
      total: totalCount,
      vendors: formattedVendors,
      freshData: vendors.length > 0,
    });
  } catch (err) {
    console.error("Get all vendors error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////////////////////////////////////
//// for getting vendor which are present in orderlist of user  //////
//////////////////////////////////////////////////////////////////////

exports.vendor_controller_getOne = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const result = await Vendor.findOne({ _id: vendorId }).lean();

    if (!result) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.json(result);
  } catch (err) {
    console.error("Get one vendor error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////// Earnings ////////
exports.vendor_controller_getEarnings = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const result = await Vendor.findOne({ _id: vendorId })
      .select(
        "earning pendingShareBy completedShareBy canceledShareBy shareCount"
      )
      .lean();

    if (!result) {
      return res.status(404).json({ message: "Could not find Vendor." });
    }

    res.json(result);
  } catch (err) {
    console.error("Get one vendor error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.vendor_controller_getAttendance = async (req, res, next) => {
  try {
    const { vendorId, month, year } = req.params;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    // Convert month and year to numbers
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate month and year
    if (monthNum < 1 || monthNum > 12) {
      return res
        .status(400)
        .json({ message: "Month must be between 1 and 12" });
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return res
        .status(400)
        .json({ message: "Year must be between 2000 and 2100" });
    }

    // Format month to have leading zero if needed (for string comparison with presentDate)
    const formattedMonth = monthNum.toString().padStart(2, "0");

    // Create a regex pattern to match dates in the format YYYY-MM-DD for the specific month and year
    // This will match dates like "2024-01-01", "2024-01-15", etc. for January 2024
    const datePattern = new RegExp(`^${yearNum}-${formattedMonth}-\\d{2}$`);

    // Find attendance records for the vendor within the specified month and year
    const attendanceRecords = await Attendance.find({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      presentDate: datePattern,
    })
      .populate("userId", "name email") // Populate user details if needed
      .populate("vendorId", "vendorName") // Populate vendor details if needed
      .sort({ presentDate: 1 }) // Sort by date ascending
      .lean();

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        message: `No attendance records found for vendor ${vendorId} in ${month}/${year}`,
        data: [],
        summary: {
          totalRecords: 0,
          presentDays: 0,
          absentDays: 0,
          totalTime: 0,
          month: monthNum,
          year: yearNum,
          period: `${yearNum}-${formattedMonth}`,
        },
      });
    }

    // Calculate summary statistics
    const summary = {
      totalRecords: attendanceRecords.length,
      presentDays: attendanceRecords.filter(
        (record) => record.attendance === true
      ).length,
      absentDays: attendanceRecords.filter(
        (record) => record.attendance === false
      ).length,
      totalTime: attendanceRecords.reduce(
        (total, record) => total + (record.totalTime || 0),
        0
      ),
      pageNo1Completed: attendanceRecords.filter(
        (record) => record.pageNo1 === true
      ).length,
      pageNo2Completed: attendanceRecords.filter(
        (record) => record.pageNo2 === true
      ).length,
      pageNo3Completed: attendanceRecords.filter(
        (record) => record.pageNo3 === true
      ).length,
      month: monthNum,
      year: yearNum,
      period: `${yearNum}-${formattedMonth}`,
    };

    // Calculate average time per day (in minutes)
    summary.averageTimePerDay =
      summary.presentDays > 0
        ? Math.round(summary.totalTime / summary.presentDays)
        : 0;

    res.json({
      message: "Attendance records retrieved successfully",
      data: attendanceRecords,
      summary: summary,
    });
  } catch (err) {
    console.error("Get vendor attendance error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.vendor_controller_postAttendance = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { attendanceData } = req.body;
    const totalTime =
      attendanceData.time1 + attendanceData.time2 + attendanceData.time3;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    const attendance = new Attendance({
      vendorId: vendorId,
      attendance: true,
      totalTime: totalTime,
      presentDate: Date.now(),
      pageNo1: true,
      pageNo2: true,
      pageNo3: true,
      attendanceData
    });
    const result = await attendance.save();

    res.json({ message: "Attendance saved successfully." });
  } catch (err) {
    console.error("Attendance error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
