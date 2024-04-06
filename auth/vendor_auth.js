const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Vendor = require("../models/vendor");
const User = require("../models/user");
const OtpAuth = require("../models/otpAuth");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/vendor";

//////////////////////////////
//// for vendor signup //////
/////////////////////////////

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
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
    } = req.body;

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const regexPass =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!regexEmail.test(email)) {
      return res.status(401).json({ message: "Invalid Email" });
    }
    if (!regexPass.test(password)) {
      return res.status(401).json({
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const [checkPhoneNoValid, checkEmailValid] = await Promise.all([
      OtpAuth.findById(validPhoneNoId).select("verifiedNumber"),
      OtpAuth.findById(validEmailId).select("verifiedEmail"),
    ]);
    const verifiedEmail = checkEmailValid?.verifiedEmail;
    const verifiedNumber = checkPhoneNoValid?.verifiedNumber;

    if (!checkPhoneNoValid || !checkPhoneNoValid.verifiedNumber) {
      return res.status(401).json({ message: "Number not verified" });
    }

    if (!checkEmailValid || !checkEmailValid.verifiedEmail) {
      return res.status(401).json({ message: "Email not verified" });
    }

    const hashedPw = await bcrypt.hash(password, 12);
    const vendor = new Vendor({
      name: name,
      phoneNo: phoneNo,
      email: email,
      password: hashedPw,
      type: type,
      gender: gender,
      verifyPhoneNo: verifiedNumber,
      verifyEmail: verifiedEmail,
      accountCreatedOn: new Date().toDateString(),
    });
    const result = await vendor.save();

    if (sharedBy && (cd === "user" || cd === "vendor")) {
      const Model = cd === "user" ? User : Vendor;
      const sharedUser = await Model.findById(sharedBy);
      if (sharedUser) {
        let balance = sharedUser.balance + 5;
        await Model.findByIdAndUpdate(sharedBy, {
          $push: {
            share: { name, phoneNo, date: new Date().toDateString() },
          },
          balance,
        });
      }
    }

    res.status(201).json({ message: "Vendor created!", vendorId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//////////////////////////////
//// for vendor login //////
/////////////////////////////

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedVendor;

  Vendor.findOne({ email: email })
    .then((vendor) => {
      if (!vendor) {
        const error = new Error("A vendor with this email could not found.");
        error.statusCode = 401;
        throw error;
      }
      loadedVendor = vendor;
      return bcrypt.compare(password, vendor.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedVendor.email,
          vendorId: loadedVendor._id.toString(),
        },
        secretKey,
        { expiresIn: "72h" }
      );
      res.status(200).json({
        token: token,
        vendorId: loadedVendor._id,
        name: loadedVendor.name,
        email: loadedVendor.email,
        verifyEmail: loadedVendor.verifyEmail,
        phoneNo: loadedVendor.phoneNo,
        verifyPhoneNo: loadedVendor.verifyPhoneNo,
        type: loadedVendor.type,
        gender: loadedVendor.gender,
        rating: loadedVendor.rating,
        ratingCount: loadedVendor.ratingCount,
        wageRate: loadedVendor.wageRate,
        address: loadedVendor.address,
        balance: loadedVendor.balance,
        imgURL: loadedVendor.imgURL,
        message: "Vendor logged In Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
