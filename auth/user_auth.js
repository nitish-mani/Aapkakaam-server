const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const OtpAuth = require("../models/otpAuth");
const User = require("../models/user");
const Vendor = require("../models/vendor");
const Employee = require("../models/employee");
const Share = require("../models/share"); // Import the Share model

const secretKey =
  process.env.JWT_SECRET ||
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/user";

////////////////////////////
//// for user signup //////
///////////////////////////

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: "Validation failed.",
        errors: errors.array(),
      });
    }

    const {
      name,
      phoneNo,
      email,
      password,
      gender,
      sharedBy,
      cd,
      fcmToken,
      validPhoneNoId,
      validEmailId,
      agreedToTnCnP,
    } = req.body;

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check phone verification
    const phoneVerification = await OtpAuth.findById(validPhoneNoId).select(
      "verifiedNumber"
    );
    if (!phoneVerification?.verifiedNumber) {
      return res.status(401).json({ message: "Phone number not verified" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNo });
    const existingVendor = await Vendor.findOne({ phoneNo });
    if (existingUser || existingVendor) {
      return res.status(409).json({ message: "Mobile number already exists!" });
    }

    // Hash password and create user
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      phoneNo,
      email: email || "",
      password: hashedPw,
      gender,
      fcmToken,
      shareBy: sharedBy,
      cd,
      balance: 5,
      verifyPhoneNo: true, // Since phone is verified
      agreedToTnCnP: Boolean(agreedToTnCnP),
      accountCreatedOn: new Date(),
    });

    const result = await user.save();

    // Handle referral/sharing logic using Share model
    if (sharedBy && cd) {
      await handleReferralBonus(sharedBy, cd, user, name, phoneNo);
    }

    res.status(201).json({
      message: "User created successfully!",
      userId: result._id,
    });
  } catch (err) {
    console.error("Signup error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Helper function for referral bonus handling
async function handleReferralBonus(sharedBy, cd, newUser, name, phoneNo) {
  try {
    let referrerModel;
    let bonusUpdate = {};

    switch (cd) {
      case "user":
        referrerModel = User;
        bonusUpdate = { $inc: { bonusAmount: 30 } };
        break;
      case "vendor":
        referrerModel = Vendor;
        bonusUpdate = { $inc: { bonusAmount: 30 } };
        break;
      case "employee":
        referrerModel = Employee;
        bonusUpdate = { $inc: { balance: 5 } };
        break;
      default:
        return;
    }

    // Update referrer's bonus
    await referrerModel.findByIdAndUpdate(sharedBy, bonusUpdate);

    // Create share record
    const shareRecord = new Share({
      userId: cd === "user" ? sharedBy : undefined,
      vendorId: cd === "vendor" ? sharedBy : undefined,
      employeeId: cd === "employee" ? sharedBy : undefined,
      phoneNo: newUser.phoneNo,
      status: "completed",
      shareDate: new Date(),
    });

    await shareRecord.save();

    // Update share count for referrer
    await referrerModel.findByIdAndUpdate(sharedBy, {
      $inc: { shareCount: 1 },
    });
  } catch (error) {
    console.error("Referral bonus handling error:", error);
    // Don't throw error to avoid affecting user registration
  }
}

///////////////////////////
//// for user login //////
//////////////////////////

exports.login = async (req, res, next) => {
  try {
    const { phoneNo, password, fcmToken } = req.body;

    if (!phoneNo || !password) {
      return res.status(400).json({
        message: "Phone number and password are required",
      });
    }

    const user = await User.findOne({ phoneNo });
    if (!user) {
      return res.status(401).json({
        message: "User with this phone number not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    // Update FCM token if provided
    if (fcmToken) {
      await User.findByIdAndUpdate(user._id, { fcmToken });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        phoneNo: user.phoneNo,
        userId: user._id.toString(),
      },
      secretKey,
      { expiresIn: "72h" }
    );

    // Prepare user data for response
    const userData = {
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
      verifyEmail: user.verifyEmail,
      phoneNo: user.phoneNo,
      verifyPhoneNo: user.verifyPhoneNo,
      bonusAmount: user.bonusAmount,
      balance: user.balance,
      address: user.address,
      gender: user.gender,
      imgURL: user.imgURL,
      pending: user.pending,
      completed: user.completed,
      canceled: user.canceled,
      pincode: user.pincode,
      message: "Login successful",
    };

    res.status(200).json(userData);
  } catch (err) {
    console.error("Login error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
