const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Employee = require("../models/employee");
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
      fcmToken,
    } = req.body;

    if (password.length < 6) {
      return res.status(401).json({
        message: "Password must be at least 6 characters long ",
      });
    }

    // const [checkPhoneNoValid, checkEmailValid] = await Promise.all([
    //   OtpAuth.findById(validPhoneNoId).select("verifiedNumber"),
    //   OtpAuth.findById(validEmailId).select("verifiedEmail"),
    // ]);
    // const verifiedEmail = checkEmailValid?.verifiedEmail;
    // const verifiedNumber = checkPhoneNoValid?.verifiedNumber;

    // if (!checkPhoneNoValid || !checkPhoneNoValid.verifiedNumber) {
    //   return res.status(401).json({ message: "Number not verified" });
    // }

    const vendorExists = await Vendor.findOne({ phoneNo: phoneNo });
    if (vendorExists) {
      return res.status(401).json({ message: "Mobile Number already exists!" });
    }

    const hashedPw = await bcrypt.hash(password, 12);
    const vendor = new Vendor({
      name: name,
      phoneNo: phoneNo,
      email: email,
      password: hashedPw,
      type: type,
      gender: gender,
      // fcmToken: fcmToken,
      // verifyPhoneNo: verifiedNumber,
      // verifyEmail: verifiedEmail,
      accountCreatedOn: new Date().toDateString(),
    });
    const result = await vendor.save();

    if (sharedBy && (cd === "user" || cd === "vendor")) {
      const Model = cd === "user" ? User : Vendor;
      const sharedUser = await Model.findById(sharedBy);
      if (sharedUser) {
        let balance = sharedUser.bonusAmount + 30;
        await Model.findByIdAndUpdate(sharedBy, {
          $push: {
            share: { name, phoneNo, date: new Date().toDateString() },
          },
          bonusAmount,
        });
      }
    } else if (cd == "employee") {
      const sharedUser = await Employee.findById(sharedBy);
      if (sharedUser) {
        const balance = sharedUser.balance + 5;
        await Employee.findByIdAndUpdate(sharedBy, {
          $push: {
            share: {
              name,
              phoneNo,
              category: "vendor",
              date: new Date().getDate(),
              month: new Date().getMonth(),
              year: new Date().getFullYear(),
              time: Date.now(),
            },
          },
          balance,
        });
      }
    }

    res.status(200).json({ message: "Vendor created!", vendorId: result._id });
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
  const phoneNo = req.body.phoneNo;
  const password = req.body.password;
  console.log(req.body.fcmToken);
  let loadedVendor;

  Vendor.findOne({ phoneNo: phoneNo })
    .then((vendor) => {
      if (!vendor) {
        const error = new Error("A vendor with this phoneNo could not found.");
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
          phoneNo: loadedVendor.phoneNo,
          vendorId: loadedVendor._id.toString(),
        },
        secretKey,
        { expiresIn: "72h" }
      );
      Vendor.findByIdAndUpdate(
        loadedVendor._id,
        { $set: { fcmToken: req.body.fcmToken } },
        { new: true }
      )
        .then((updatedVendor) => {
          console.log("Updated Vendor:", updatedVendor);
        })
        .catch((err) => {
          console.error("Error updating vendor:", err);
        });

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
        bonusAmount: loadedVendor.bonusAmount,
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
