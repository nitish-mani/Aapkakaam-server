const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Employee = require("../models/employee");
const Vendor = require("../models/vendor");
const User = require("../models/user");
const OtpAuth = require("../models/otpAuth");
const Share = require("../models/share");

const secretKey =
  process.env.JWT_SECRET ||
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/vendor";

// Commission configuration - moved outside function for better performance
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

//////////////////////////////
//// for vendor signup //////
/////////////////////////////

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
      type,
      gender,
      sharedBy,
      cd,
      validPhoneNoId,
      validEmailId,
      fcmToken,
      agreedToTnCnP,
    } = req.body;

    // Validate required fields
    if (!name || !phoneNo || !password || !type) {
      return res.status(400).json({
        message: "Name, phone number, password, and type are required fields",
      });
    }

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

    // Check if vendor already exists
    const existingUser = await User.findOne({ phoneNo });
    const existingVendor = await Vendor.findOne({ phoneNo });
    if (existingVendor || existingUser) {
      return res.status(409).json({ message: "Mobile number already exists!" });
    }

    // Calculate commission and initial balance
    const commission = getCommission(type);
    const initialBalance = commission * 5; // 5x commission as initial balance

    // Hash password and create vendor
    const hashedPw = await bcrypt.hash(password, 12);
    const vendor = new Vendor({
      name,
      phoneNo,
      email: email || "",
      password: hashedPw,
      type,
      gender,
      commission,
      wageRate: 0, // Explicitly set default values
      wageRateType: "", // Set default wage rate type
      balance: initialBalance + 5,
      bonusAmount: 150, // Default bonus amount from schema
      shareBy: sharedBy,
      cd,
      fcmToken,
      verifyPhoneNo: true, // Since phone is verified
      agreedToTnCnP: Boolean(agreedToTnCnP),
      accountCreatedOn: new Date(), // Use Date object instead of string
    });

    const result = await vendor.save();

    // Handle referral/sharing logic
    if (sharedBy && cd) {
      await handleVendorReferral(sharedBy, cd, vendor, name, phoneNo);
    }

    res.status(201).json({
      message: "Vendor created successfully!",
      vendorId: result._id,
      commission,
      initialBalance,
    });
  } catch (err) {
    console.error("Vendor signup error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Helper function for vendor referral handling
async function handleVendorReferral(sharedBy, cd, newVendor, name, phoneNo) {
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
      phoneNo: newVendor.phoneNo,
      status: "completed",
      shareDate: new Date(),
    });

    await shareRecord.save();

    // Update share count for referrer
    await referrerModel.findByIdAndUpdate(sharedBy, {
      $inc: { shareCount: 1 },
    });
  } catch (error) {
    console.error("Vendor referral bonus handling error:", error);
    // Don't throw error to avoid affecting vendor registration
  }
}

//////////////////////////////
//// for vendor login //////
/////////////////////////////

exports.login = async (req, res, next) => {
  try {
    const { phoneNo, password, fcmToken } = req.body;

    if (!phoneNo || !password) {
      return res.status(400).json({
        message: "Phone number and password are required",
      });
    }

    const vendor = await Vendor.findOne({ phoneNo });
    if (!vendor) {
      return res.status(401).json({
        message: "Vendor with this phone number not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, vendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    // Update FCM token if provided
    if (fcmToken) {
      await Vendor.findByIdAndUpdate(vendor._id, { fcmToken });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        phoneNo: vendor.phoneNo,
        vendorId: vendor._id.toString(),
        type: vendor.type, // Include vendor type in token for authorization
      },
      secretKey,
      { expiresIn: "72h" }
    );

    // Prepare vendor data for response
    const vendorData = {
      token,
      vendorId: vendor._id,
      name: vendor.name,
      email: vendor.email,
      verifyEmail: vendor.verifyEmail,
      phoneNo: vendor.phoneNo,
      verifyPhoneNo: vendor.verifyPhoneNo,
      type: vendor.type,
      gender: vendor.gender,
      rating: vendor.rating,
      ratingCount: vendor.ratingCount,
      wageRate: vendor.wageRate,
      wageRateType: vendor.wageRateType,
      commission: vendor.commission,
      address: vendor.address,
      balance: vendor.balance,
      bonusAmount: vendor.bonusAmount,
      imgURL: vendor.imgURL,
      pending: vendor.pending,
      completed: vendor.completed,
      canceled: vendor.canceled,
      earning: vendor.earning,
      pincode: vendor.pincode,
      message: "Vendor login successful",
    };

    res.status(200).json(vendorData);
  } catch (err) {
    console.error("Vendor login error:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
