const { default: axios } = require("axios");
const User = require("../models/user");
const Vendor = require("../models/vendor");
const nodemailer = require("nodemailer");
const OtpAuth = require("../models/otpAuth");
const bcrypt = require("bcryptjs");
const Share = require("../models/share");
const Bookings = require("../models/bookings");
require("dotenv").config();

const otp = () => Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

////////////////////////////////////
///// for Email Verification ///////
//////////////////////////////////

exports.user_controller_verify_email = async (req, res, next) => {
  try {
    const otpE = otp();
    const email = req.body.email;
    const otpId = req.body.otpId;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Create new OTP record
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

exports.user_controller_otpE = async (req, res, next) => {
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

exports.user_controller_verify_phoneNo = async (req, res, next) => {
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
      `${process.env.FAST2SMS}?route=otp&variables_values=${otpM}&flash=0&numbers=${phoneNo}`
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

exports.user_controller_otp = async (req, res, next) => {
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
//// for updating user password //////
///////////////////////////////////////

exports.user_controller_patch_password = async (req, res, next) => {
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

    const result = await OtpAuth.findById(otpId);
    if (!result?.verifiedEmail) {
      return res.status(404).json({ message: "Not verified user" });
    }

    const hashPass = await bcrypt.hash(password, 12);
    const user = await User.findOneAndUpdate(
      { email: email },
      { password: hashPass },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "User with this Email Not found" });
    }

    res.status(201).json({ message: "password changed successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(404).json({ message: "Not Authorized" });
  }
};

///////////////////////////////////////
///// for updating user address //////
//////////////////////////////////////

exports.user_controller_patch_address = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    const vill = req.body.vill;
    const post = req.body.post;
    const dist = req.body.dist;
    const state = req.body.state;
    const pincode = req.body.pincode;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const address = { vill, post, dist, state, pincode };

    const loadedUser = await User.findByIdAndUpdate(
      userId,
      {
        address: [address],
        pincode: pincode,
      },
      { new: true }
    );

    if (!loadedUser) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.status(200).json({
      address: loadedUser.address,
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
///// for modifing user name //////
//////////////////////////////////////

exports.user_controller_patch_name = async (req, res, next) => {
  try {
    const name = req.body.name;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const loadedUser = await User.findByIdAndUpdate(
      userId,
      { name },
      { new: true }
    );

    if (!loadedUser) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.status(200).json({
      name: loadedUser.name,
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
///// for modifing user fcm token //////
//////////////////////////////////////

exports.user_controller_patch_fcmToken = async (req, res, next) => {
  try {
    const fcmToken = req.body.fcmToken;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const loadedUser = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true }
    );

    if (!loadedUser) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.status(200).json({
      fcmToken: loadedUser.fcmToken,
      message: "token Updated Successfully",
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
///// for modifing user phoneNo //////
//////////////////////////////////////

exports.user_controller_patch_phoneNo = async (req, res, next) => {
  try {
    const phoneNo = req.body.phoneNo;
    const userId = req.body.userId;
    const otpId = req.body.otpId;

    if (!userId || !phoneNo || !otpId) {
      return res
        .status(400)
        .json({ message: "User ID, phone number, and OTP ID are required" });
    }

    const result = await OtpAuth.findById(otpId);
    if (!result?.verifiedNumber) {
      return res.status(404).json({ message: "Not Verified User" });
    }

    // Check if phone number is already used
    const existingUser = await User.findOne({ phoneNo, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(401).json({ message: "Phone number already exists!" });
    }

    const loadedUser = await User.findByIdAndUpdate(
      userId,
      { phoneNo },
      { new: true }
    );

    if (!loadedUser) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.status(200).json({
      phoneNo: loadedUser.phoneNo,
      message: "Phone Number Updated Successfully",
    });
  } catch (err) {
    console.error("Phone number update error:", err);
    res.status(404).json({ message: "Not Authorized" });
  }
};

///////////////////////////////////////
///// for modifing user email //////
//////////////////////////////////////

exports.user_controller_patch_email = async (req, res, next) => {
  try {
    const email = req.body.email;
    const userId = req.body.userId;
    const otpId = req.body.otpId;

    if (!userId || !email || !otpId) {
      return res
        .status(400)
        .json({ message: "User ID, email, and OTP ID are required" });
    }

    const result = await OtpAuth.findById(otpId);
    if (!result?.verifiedEmail) {
      return res.status(404).json({ message: "Not Verified User" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      email: email,
      _id: { $ne: userId },
    });
    if (existingUser?.email) {
      return res.status(401).json({ message: "Email already exist !" });
    }

    const loadedUser = await User.findByIdAndUpdate(
      userId,
      { email },
      { new: true }
    );

    if (!loadedUser) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.status(200).json({
      email: loadedUser.email,
      message: "Email Updated Successfully",
    });
  } catch (err) {
    console.error("Email update error:", err);
    res.status(404).json({ message: "Not Authorized" });
  }
};

///////////////////////////////////////
///// for getting user orders //////
//////////////////////////////////////

exports.user_controller_getOrders = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.params.pageNo);
    console.log(userId, page);
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const skip = (page - 1) * 12;
    const bookings = await Bookings.find({ userId: userId })
      .populate("vendorId", "name phoneNo ")
      .sort({ bookedOn: -1 })
      .skip(skip)
      .lean();
    console.log(bookings);
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
///// for getting user share //////
//////////////////////////////////////

exports.user_controller_getShare = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    let skip = parseInt(req.params.skip) || 0;
    const limit = 12;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const total = await Share.countDocuments({ userId: userId });
    if (skip >= total) {
      skip = 0; // Reset to first page or handle as needed
      // OR: skip = Math.max(0, total - limit); // Go to last page
    }

    // Also ensure skip doesn't cause empty results when near the end
    if (skip + limit > total && skip > 0) {
      skip = Math.max(0, total - limit);
    }
    const shares = await Share.find({ userId: userId })
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

///////////////////////////////////////
///// for getting user by user //////
//////////////////////////////////////

exports.user_controller_getUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const loadedUser = await User.findOne({ _id: userId })
      .select("balance bonusAmount")
      .lean();

    if (!loadedUser) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.status(200).json({
      balance: loadedUser.balance,
      bonusAmount: loadedUser.bonusAmount,
    });
  } catch (err) {
    console.error("Get user error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////////////////////////////////////////
//// for getting user which are present in orderlist of user  //////
//////////////////////////////////////////////////////////////////////

exports.user_controller_getOne = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const result = await User.findOne({ _id: userId }).lean();

    if (!result) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.json(result);
  } catch (err) {
    console.error("Get one user error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

////// Earnings //////

exports.user_controller_getEarnings = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const result = await User.findOne({ _id: userId })
      .select(
        "earning pendingShareBy completedShareBy canceledShareBy shareCount"
      )
      .lean();

    if (!result) {
      return res.status(404).json({ message: "Could not find User." });
    }

    res.json(result);
  } catch (err) {
    console.error("Get one user error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
