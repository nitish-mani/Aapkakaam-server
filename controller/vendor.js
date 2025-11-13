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

    // Find bookings matching any of the formats
    const bookings = await Bookings.find({
      vendorId: vendorId,
      $or: [{ bookingDate: { $regex: regexPatterns } }],
    })
      .populate("userId", "name phoneNo address")
      .lean();
    console.log(bookings);
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

    // Get vendorIds with active bookings on the specified date (excluding canceled orders)
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

    // Exclude only booked vendors
    if (bookedVendorIds.length > 0) {
      baseMatchStage._id = { $nin: bookedVendorIds };
    }

    const skip = (page - 1) * limit;
    const requestContext = `${type}-${pincode}-${bookingDate}`;
    const userIdentifier = req.user?._id
      ? req.user._id.toString()
      : `${req.ip}-${req.headers["user-agent"]?.substring(0, 50)}`;

    let vendors = [];
    let totalCount;

    // STRATEGY 1: Fresh vendors for this user context
    const session = await Vendor.startSession();
    try {
      await session.withTransaction(async () => {
        const freshVendors = await Vendor.find({
          ...baseMatchStage,
          $or: [
            { [`userShownContext.${userIdentifier}`]: { $ne: requestContext } },
            { [`userShownContext.${userIdentifier}`]: { $exists: false } },
          ],
        })
          .session(session)
          .limit(limit)
          .select(
            "_id name type gender phoneNo rating ratingCount wageRate imgURL"
          )
          .lean();

        if (freshVendors.length > 0) {
          const updateOperations = freshVendors.map((vendor) =>
            Vendor.updateOne(
              { _id: vendor._id },
              {
                $set: {
                  [`userShownContext.${userIdentifier}`]: requestContext,
                  lastShownContext: requestContext,
                },
              },
              { session }
            )
          );

          await Promise.all(updateOperations);
          vendors = freshVendors;
        }
      });
    } finally {
      await session.endSession();
    }

    totalCount = await Vendor.countDocuments(baseMatchStage);

    // STRATEGY 2: User-specific previously shown vendors
    if (vendors.length === 0) {
      const userSpecificVendors = await Vendor.find({
        ...baseMatchStage,
        [`userShownContext.${userIdentifier}`]: requestContext,
      })
        .select(
          "_id name type gender phoneNo rating ratingCount wageRate wageRateType imgURL"
        )
        .limit(limit)
        .lean();

      if (userSpecificVendors.length > 0) {
        vendors = userSpecificVendors;
      } else {
        // STRATEGY 3: Use MongoDB aggregation for random sampling with pagination
        const randomVendors = await Vendor.aggregate([
          { $match: baseMatchStage },
          { $sample: { size: 1000 } }, // Sample larger pool for pagination
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              name: 1,
              type: 1,
              gender: 1,
              phoneNo: 1,
              rating: 1,
              ratingCount: 1,
              wageRate: 1,
              wageRateType: 1,
              imgURL: 1,
            },
          },
        ]);

        vendors = randomVendors;
      }
    }

    // Format phone numbers
    const formattedVendors = vendors.map((vendor) => ({
      ...vendor,
      phoneNo: vendor.phoneNo
        ? vendor.phoneNo.toString().replace(/(\d{2})\d{6}(\d{2})/, "$1******$2")
        : "",
    }));

    res.status(200).json({
      total: totalCount,
      vendors: formattedVendors,
      freshData: vendors.length > 0,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: skip + vendors.length < totalCount,
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

// exports.vendor_controller_getAttendance = async (req, res, next) => {
//   try {
//     const { vendorId, month, year } = req.params;
//     console.log("Fetching attendance for:", { vendorId, month, year });

//     // Input validation
//     if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
//       return res.status(400).json({
//         message: "Valid Vendor ID is required",
//       });
//     }

//     if (!month || !year) {
//       return res.status(400).json({
//         message: "Month and year are required",
//       });
//     }

//     // Convert and validate month/year
//     const monthNum = parseInt(month);
//     const yearNum = parseInt(year);

//     if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
//       return res.status(400).json({
//         message: "Month must be a number between 1 and 12",
//       });
//     }

//     if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
//       return res.status(400).json({
//         message: "Year must be a number between 2000 and 2100",
//       });
//     }

//     // Calculate date range for the month
//     const startDate = new Date(yearNum, monthNum - 1, 1);
//     const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // Last day of month

//     // Format dates for query (handling both string and timestamp formats)
//     const startTimestamp = startDate.getTime();
//     const endTimestamp = endDate.getTime();

//     // Find attendance records using timestamp range
//     const attendanceRecords = await Attendance.find({
//       vendorId: new mongoose.Types.ObjectId(vendorId),
//       $or: [
//         // Handle string dates (ISO format)
//         {
//           presentDate: {
//             $gte: startDate.toISOString().split("T")[0],
//             $lte: endDate.toISOString().split("T")[0],
//           },
//         },
//         // Handle timestamp format (like 1761676402719)
//         {
//           presentDate: {
//             $gte: startTimestamp,
//             $lte: endTimestamp,
//           },
//         },
//       ],
//     })
//       .populate("userId", "name ")
//       .populate("vendorId", "name")
//       .sort({ presentDate: 1 })
//       .lean()
//       .maxTimeMS(30000); // 30 second timeout

//     // If no records found, return empty response with proper structure
//     if (!attendanceRecords || attendanceRecords.length === 0) {
//       const formattedMonth = monthNum.toString().padStart(2, "0");
//       return res.status(200).json({
//         message: `No attendance records found for vendor in ${monthNum}/${yearNum}`,
//         data: [],
//         summary: {
//           totalRecords: 0,
//           presentDays: 0,
//           absentDays: 0,
//           totalTime: 0,
//           averageTimePerDay: 0,
//           pageNo1Completed: 0,
//           pageNo2Completed: 0,
//           pageNo3Completed: 0,
//           month: monthNum,
//           year: yearNum,
//           period: `${yearNum}-${formattedMonth}`,
//           dateRange: {
//             start: startDate.toISOString(),
//             end: endDate.toISOString(),
//           },
//           averagePagesPerDay: 0,
//           attendanceRate: 0,
//         },
//       });
//     }

//     // Process records to handle different date formats
//     const processedRecords = attendanceRecords.map((record) => {
//       let date;

//       // Handle timestamp format (like 1761676402719)
//       if (
//         typeof record.presentDate === "number" ||
//         (typeof record.presentDate === "string" &&
//           /^\d+$/.test(record.presentDate))
//       ) {
//         const timestamp = parseInt(record.presentDate);
//         date = new Date(timestamp);
//       }
//       // Handle string date format (like "2024-01-15")
//       else if (typeof record.presentDate === "string") {
//         date = new Date(record.presentDate);
//       }
//       // Handle Date object
//       else if (record.presentDate instanceof Date) {
//         date = record.presentDate;
//       }

//       return {
//         ...record,
//         presentDate: date ? date.toISOString() : record.presentDate,
//         day: date ? date.getDate() : null,
//         dayOfWeek: date ? date.getDay() : null,
//       };
//     });

//     // Calculate base statistics first
//     const presentRecords = processedRecords.filter(
//       (record) => record.attendance === true
//     );
//     const totalTime = presentRecords.reduce(
//       (total, record) => total + (record.totalTime || 0),
//       0
//     );
//     const pageNo1Completed = processedRecords.filter(
//       (record) => record.pageNo1 === true
//     ).length;
//     const pageNo2Completed = processedRecords.filter(
//       (record) => record.pageNo2 === true
//     ).length;
//     const pageNo3Completed = processedRecords.filter(
//       (record) => record.pageNo3 === true
//     ).length;

//     // Calculate derived metrics
//     const averageTimePerDay =
//       presentRecords.length > 0
//         ? Math.round(totalTime / presentRecords.length)
//         : 0;
//     const totalPagesCompleted =
//       pageNo1Completed + pageNo2Completed + pageNo3Completed;
//     const averagePagesPerDay =
//       processedRecords.length > 0
//         ? Math.round((totalPagesCompleted / processedRecords.length) * 100) /
//           100
//         : 0;
//     const attendanceRate =
//       processedRecords.length > 0
//         ? Math.round((presentRecords.length / processedRecords.length) * 100)
//         : 0;

//     // Build summary object
//     const summary = {
//       totalRecords: processedRecords.length,
//       presentDays: presentRecords.length,
//       absentDays: processedRecords.filter(
//         (record) => record.attendance === false
//       ).length,
//       totalTime: totalTime,
//       averageTimePerDay: averageTimePerDay,
//       pageNo1Completed: pageNo1Completed,
//       pageNo2Completed: pageNo2Completed,
//       pageNo3Completed: pageNo3Completed,
//       month: monthNum,
//       year: yearNum,
//       period: `${yearNum}-${monthNum.toString().padStart(2, "0")}`,
//       dateRange: {
//         start: startDate.toISOString(),
//         end: endDate.toISOString(),
//       },
//       // Additional metrics - now calculated before summary initialization
//       averagePagesPerDay: averagePagesPerDay,
//       attendanceRate: attendanceRate,
//       totalPagesCompleted: totalPagesCompleted,
//     };

//     res.json({
//       message: "Attendance records retrieved successfully",
//       data: processedRecords,
//       summary: summary,
//       metadata: {
//         vendorId: vendorId,
//         recordsCount: processedRecords.length,
//         queryPeriod: `${monthNum}/${yearNum}`,
//         generatedAt: new Date().toISOString(),
//       },
//     });
//   } catch (err) {
//     console.error("Get vendor attendance error:", err);

//     // Handle specific MongoDB errors
//     if (err.name === "CastError") {
//       return res.status(400).json({
//         message: "Invalid vendor ID format",
//       });
//     }

//     if (err.name === "MongoTimeoutError") {
//       return res.status(408).json({
//         message: "Database query timeout",
//       });
//     }

//     // Default error response
//     const statusCode = err.statusCode || 500;
//     res.status(statusCode).json({
//       message: err.message || "Internal server error",
//       error: process.env.NODE_ENV === "development" ? err.stack : undefined,
//     });
//   }
// };

exports.vendor_controller_getAttendance = async (req, res, next) => {
  try {
    const { vendorId, month, year } = req.params;
    console.log("Fetching attendance for:", { vendorId, month, year });

    // Input validation
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        message: "Valid Vendor ID is required",
      });
    }

    if (!month || !year) {
      return res.status(400).json({
        message: "Month and year are required",
      });
    }

    // Convert and validate month/year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: "Month must be a number between 1 and 12",
      });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        message: "Year must be a number between 2000 and 2100",
      });
    }

    // Get vendor account creation date
    const vendor = await Vendor.findById(vendorId)
      .select("accountCreatedOn")
      .lean();
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    const accountCreatedOn = new Date(vendor.accountCreatedOn);
    accountCreatedOn.setHours(0, 0, 0, 0); // Normalize to start of day
    console.log("Account created on:", accountCreatedOn.toISOString());

    // Calculate date range for the requested month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // Last day of month
    const totalDaysInMonth = endDate.getDate();

    // Get current date (today)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    console.log(
      "Month range:",
      startDate.toISOString(),
      "to",
      endDate.toISOString()
    );
    console.log("Current date:", currentDate.toISOString());

    // Determine the effective date range for this vendor
    const effectiveStartDate = new Date(
      Math.max(startDate.getTime(), accountCreatedOn.getTime())
    );
    const effectiveEndDate = new Date(
      Math.min(endDate.getTime(), currentDate.getTime())
    );

    effectiveStartDate.setHours(0, 0, 0, 0);
    effectiveEndDate.setHours(23, 59, 59, 999);

    console.log(
      "Effective range:",
      effectiveStartDate.toISOString(),
      "to",
      effectiveEndDate.toISOString()
    );

    // Calculate total valid days (days when vendor could have marked attendance)
    const totalValidDays = calculateDaysBetween(
      effectiveStartDate,
      effectiveEndDate
    );
    console.log("Total valid days:", totalValidDays);

    // Build query for attendance records - search for records in the entire month
    const attendanceRecords = await Attendance.find({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      $or: [
        // For string dates (ISO format YYYY-MM-DD)
        {
          presentDate: {
            $gte: startDate.toISOString().split("T")[0],
            $lte: endDate.toISOString().split("T")[0],
          },
        },
        // For timestamp format
        {
          presentDate: {
            $gte: startDate.getTime(),
            $lte: endDate.getTime(),
          },
        },
        // For Date objects
        {
          presentDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ],
    })
      .populate("userId", "name")
      .populate("vendorId", "name")
      .sort({ presentDate: 1 })
      .lean()
      .maxTimeMS(30000);

    console.log(`Found ${attendanceRecords.length} attendance records`);

    // Process records and normalize dates
    const processedRecords = attendanceRecords.map((record) => {
      let date = normalizeDate(record.presentDate);
      let status = determineAttendanceStatus(record);

      return {
        ...record,
        presentDate: date ? date.toISOString() : record.presentDate,
        date: date ? date.toISOString().split("T")[0] : null, // YYYY-MM-DD format
        day: date ? date.getDate() : null,
        dayOfWeek: date ? date.getDay() : null,
        status: status,
        markedAbsent: record.markedAbsent || false,
        isWithinValidPeriod: date
          ? isDateInRange(date, effectiveStartDate, effectiveEndDate)
          : false,
      };
    });

    // Filter records that are within the valid period
    const validRecords = processedRecords.filter(
      (record) => record.isWithinValidPeriod
    );

    // Separate present and absent records
    const presentRecords = validRecords.filter(
      (record) => record.status === "present"
    );
    const absentRecords = validRecords.filter(
      (record) => record.status === "absent"
    );

    // Calculate statistics
    const totalTime = presentRecords.reduce(
      (total, record) => total + (record.totalTime || 0),
      0
    );
    const pageNo1Completed = validRecords.filter(
      (record) => record.pageNo1 === true
    ).length;
    const pageNo2Completed = validRecords.filter(
      (record) => record.pageNo2 === true
    ).length;
    const pageNo3Completed = validRecords.filter(
      (record) => record.pageNo3 === true
    ).length;

    // Calculate days with no records (true absent days)
    const recordedDates = new Set();
    validRecords.forEach((record) => {
      if (record.date) {
        recordedDates.add(record.date);
      }
    });

    const trueAbsentDays = Math.max(0, totalValidDays - recordedDates.size);

    console.log("Statistics:", {
      totalValidDays,
      presentRecords: presentRecords.length,
      absentRecords: absentRecords.length,
      trueAbsentDays,
      recordedDates: recordedDates.size,
    });

    // Generate complete monthly calendar
    const monthlyCalendar = generateMonthlyCalendar(
      yearNum,
      monthNum,
      processedRecords,
      accountCreatedOn,
      currentDate,
      effectiveStartDate,
      effectiveEndDate
    );

    // Calculate derived metrics
    const averageTimePerDay =
      presentRecords.length > 0
        ? Math.round(totalTime / presentRecords.length)
        : 0;
    const totalPagesCompleted =
      pageNo1Completed + pageNo2Completed + pageNo3Completed;
    const averagePagesPerDay =
      validRecords.length > 0
        ? Math.round((totalPagesCompleted / validRecords.length) * 100) / 100
        : 0;

    // Calculate rates based on total valid days
    const attendanceRate =
      totalValidDays > 0
        ? Math.round((presentRecords.length / totalValidDays) * 100)
        : 0;
    const absenceRate =
      totalValidDays > 0
        ? Math.round(
            ((absentRecords.length + trueAbsentDays) / totalValidDays) * 100
          )
        : 0;

    // Build comprehensive summary
    const summary = buildSummary(
      totalDaysInMonth,
      totalValidDays,
      validRecords.length,
      presentRecords.length,
      absentRecords.length,
      trueAbsentDays,
      totalTime,
      averageTimePerDay,
      pageNo1Completed,
      pageNo2Completed,
      pageNo3Completed,
      monthNum,
      yearNum,
      averagePagesPerDay,
      attendanceRate,
      absenceRate,
      totalPagesCompleted,
      accountCreatedOn,
      effectiveStartDate,
      effectiveEndDate,
      startDate,
      endDate
    );

    // Handle edge cases
    if (totalValidDays === 0) {
      return handleNoValidDays(
        res,
        monthNum,
        yearNum,
        monthlyCalendar,
        summary,
        accountCreatedOn,
        startDate,
        endDate,
        currentDate
      );
    }

    if (validRecords.length === 0 && totalValidDays > 0) {
      return handleNoRecordsButValidDays(
        res,
        monthNum,
        yearNum,
        monthlyCalendar,
        summary,
        totalValidDays
      );
    }

    // Successful response
    res.json({
      message: "Attendance records retrieved successfully",
      data: processedRecords,
      monthlyCalendar: monthlyCalendar,
      summary: summary,
      metadata: {
        vendorId: vendorId,
        recordsCount: validRecords.length,
        queryPeriod: `${monthNum}/${yearNum}`,
        generatedAt: new Date().toISOString(),
        totalValidDays: totalValidDays,
        statusBreakdown: {
          present: presentRecords.length,
          markedAbsent: absentRecords.length,
          noRecordAbsent: trueAbsentDays,
          future: monthlyCalendar.filter((day) => day.status === "future")
            .length,
          beforeAccount: monthlyCalendar.filter(
            (day) => day.status === "before-account"
          ).length,
        },
      },
    });
  } catch (err) {
    console.error("Get vendor attendance error:", err);
    return handleError(err, res);
  }
};

// Helper functions

function normalizeDate(dateValue) {
  if (!dateValue) return null;

  let date;

  // Handle timestamp format
  if (
    typeof dateValue === "number" ||
    (typeof dateValue === "string" && /^\d+$/.test(dateValue))
  ) {
    date = new Date(parseInt(dateValue));
  }
  // Handle string date format
  else if (typeof dateValue === "string") {
    date = new Date(dateValue);
  }
  // Handle Date object
  else if (dateValue instanceof Date) {
    date = new Date(dateValue);
  }

  if (date && !isNaN(date.getTime())) {
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    return date;
  }

  return null;
}

function determineAttendanceStatus(record) {
  if (record.attendance === true) {
    return "present";
  } else if (record.attendance === false || record.markedAbsent === true) {
    return "absent";
  } else {
    // If no explicit attendance flag, check activity
    return record.totalTime && record.totalTime > 0 ? "present" : "absent";
  }
}

function isDateInRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

function calculateDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const timeDiff = end.getTime() - start.getTime();
  const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  return Math.max(0, dayDiff);
}

function generateMonthlyCalendar(
  year,
  month,
  records,
  accountCreatedOn,
  currentDate,
  effectiveStartDate,
  effectiveEndDate
) {
  const totalDays = new Date(year, month, 0).getDate();
  const calendar = [];

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    const existingRecord = records.find((record) => {
      const recordDate = normalizeDate(record.presentDate);
      return recordDate && recordDate.getTime() === date.getTime();
    });

    let status = "no-record";
    let category = "active";

    // Determine category and status
    if (date < accountCreatedOn) {
      status = "before-account";
      category = "inactive";
    } else if (date > currentDate) {
      status = "future";
      category = "inactive";
    } else if (date < effectiveStartDate || date > effectiveEndDate) {
      status = "outside-range";
      category = "inactive";
    } else if (existingRecord) {
      status = existingRecord.status;
      category = "active";
    } else {
      status = "absent"; // Valid day with no record
      category = "active";
    }

    calendar.push({
      day: day,
      date: date.toISOString().split("T")[0],
      dayOfWeek: date.getDay(),
      status: status,
      category: category,
      record: existingRecord || null,
      isActivePeriod: category === "active",
    });
  }

  return calendar;
}

function buildSummary(
  totalDaysInMonth,
  totalValidDays,
  totalRecords,
  presentDays,
  absentDays,
  trueAbsentDays,
  totalTime,
  averageTimePerDay,
  pageNo1Completed,
  pageNo2Completed,
  pageNo3Completed,
  month,
  year,
  averagePagesPerDay,
  attendanceRate,
  absenceRate,
  totalPagesCompleted,
  accountCreatedOn,
  effectiveStartDate,
  effectiveEndDate,
  startDate,
  endDate
) {
  return {
    // Basic counts
    totalDaysInMonth: totalDaysInMonth,
    totalValidDays: totalValidDays,
    totalRecords: totalRecords,

    // Attendance breakdown
    presentDays: presentDays,
    recordedAbsentDays: absentDays,
    trueAbsentDays: trueAbsentDays,
    totalAbsentDays: absentDays + trueAbsentDays,

    // Time and pages
    totalTime: totalTime,
    averageTimePerDay: averageTimePerDay,
    pageNo1Completed: pageNo1Completed,
    pageNo2Completed: pageNo2Completed,
    pageNo3Completed: pageNo3Completed,
    totalPagesCompleted: totalPagesCompleted,
    averagePagesPerDay: averagePagesPerDay,

    // Rates and ratios
    attendanceRate: attendanceRate,
    absenceRate: absenceRate,
    workingDaysRatio: `${presentDays}/${totalValidDays}`,

    // Date information
    month: month,
    year: year,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    accountCreatedOn: accountCreatedOn.toISOString(),
    effectiveStartDate: effectiveStartDate.toISOString(),
    effectiveEndDate: effectiveEndDate.toISOString(),
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },

    // Additional metrics
    absenceBreakdown: {
      markedAbsent: absentDays,
      noRecordAbsent: trueAbsentDays,
    },
  };
}

function handleNoValidDays(
  res,
  monthNum,
  yearNum,
  monthlyCalendar,
  summary,
  accountCreatedOn,
  startDate,
  endDate,
  currentDate
) {
  let message = "No valid days in selected period";

  if (accountCreatedOn > endDate) {
    message = "Selected month is before account creation date";
  } else if (startDate > currentDate) {
    message = "Selected month is in the future";
  }

  return res.status(200).json({
    message: message,
    data: [],
    monthlyCalendar: monthlyCalendar,
    summary: {
      ...summary,
      totalRecords: 0,
      presentDays: 0,
      recordedAbsentDays: 0,
      trueAbsentDays: 0,
      totalAbsentDays: 0,
      totalTime: 0,
      averageTimePerDay: 0,
      pageStats: {
        pageNo1Completed: 0,
        pageNo2Completed: 0,
        pageNo3Completed: 0,
      },
      averagePagesPerDay: 0,
      attendanceRate: 0,
      absenceRate: 0,
      totalPagesCompleted: 0,
      workingDaysRatio: `0/0`,
      absenceBreakdown: { markedAbsent: 0, noRecordAbsent: 0 },
    },
  });
}

function handleNoRecordsButValidDays(
  res,
  monthNum,
  yearNum,
  monthlyCalendar,
  summary,
  totalValidDays
) {
  return res.status(200).json({
    message: `No attendance records found for vendor in ${monthNum}/${yearNum}`,
    data: [],
    monthlyCalendar: monthlyCalendar,
    summary: {
      ...summary,
      totalRecords: 0,
      presentDays: 0,
      recordedAbsentDays: 0,
      trueAbsentDays: totalValidDays,
      totalAbsentDays: totalValidDays,
      totalTime: 0,
      averageTimePerDay: 0,
      pageNo1Completed: 0,
      pageNo2Completed: 0,
      pageNo3Completed: 0,
      averagePagesPerDay: 0,
      attendanceRate: 0,
      absenceRate: 100,
      totalPagesCompleted: 0,
      workingDaysRatio: `0/${totalValidDays}`,
      absenceBreakdown: {
        markedAbsent: 0,
        noRecordAbsent: totalValidDays,
      },
    },
  });
}

function handleError(err, res) {
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid vendor ID format",
    });
  }

  if (err.name === "MongoTimeoutError") {
    return res.status(408).json({
      message: "Database query timeout",
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

exports.vendor_controller_postAttendance = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { attendanceData } = req.body;
    const totalTime =
      parseInt(attendanceData.time1) +
      parseInt(attendanceData.time2) +
      parseInt(attendanceData.time3);
    console.log(totalTime);
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    const isPresentToday = await Vendor.findById(vendorId).select(
      "presentDate"
    );
    const targetDate = new Date();
    const storedDate = new Date(isPresentToday.presentDate);

    const isSameDay =
      storedDate &&
      storedDate.getDate() === targetDate.getDate() &&
      storedDate.getMonth() === targetDate.getMonth() &&
      storedDate.getFullYear() === targetDate.getFullYear();

    if (isSameDay) {
      return res
        .status(200)
        .json({ message: "Attendance already marked today" });
    }

    const attendance = new Attendance({
      vendorId: vendorId,
      attendance: true,
      totalTime: totalTime,
      presentDate: Date.now(),
      pageNo1: true,
      pageNo2: true,
      pageNo3: true,
      attendanceData,
    });
    const result = await attendance.save();
    const presentDate = Date.now();
    await Vendor.findByIdAndUpdate(vendorId, { presentDate }, { new: true });

    res.json({ message: "Attendance saved successfully." });
  } catch (err) {
    console.error("Attendance error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
