const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const OtpAuth = require("../models/otpAuth");
const Admin = require("../models/admin");
const User = require("../models/user");
const Vendor = require("../models/vendor");
const Employee = require("../models/employee");
const Bookings = require("../models/bookings");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/admin";
const email_admin = "admin@aapkakaam.com";

//////////////////////////////
//// for admin signup ////
/////////////////////////////

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const name = req.body.name;
  const email = req.body.email;
  const phoneNo = req.body.phoneNo;
  const password = req.body.password;
  const validEmailId = req.body.validEmailId;
  const validPhoneNoId = req.body.validPhoneNoId;

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

  if (email === email_admin)
    Admin.findOne({ email: email }).then((resuslt) => {
      if (resuslt?.email)
        return res.status(401).json({ message: "Email already exist !" });
      bcrypt
        .hash(password, 12)
        .then((hashedPw) => {
          const admin = new Admin({
            name: name,
            phoneNo: phoneNo,
            email: email,
            password: hashedPw,
          });
          return admin.save();
        })
        .then((result) => {
          res
            .status(201)
            .json({ message: "Admin created!", adminId: result._id });
        })
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
    });
  else {
    res.status(404).json({ message: "Not Authorized...Thanks..." });
  }
};

///////////////////////////////
//// for admin login //////
/////////////////////////////

exports.login = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const loadedAdmin = await Admin.findOne({ email: email });

    if (!loadedAdmin) {
      const error = new Error("An admin with this email could not be found.");
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, loadedAdmin.password);

    if (!isEqual) {
      const error = new Error("Wrong password!");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: loadedAdmin.email,
        adminId: loadedAdmin._id.toString(),
      },
      secretKey,
      { expiresIn: "1h" }
    );

    const totalCountPromises = [
      getTotalCount(User),
      getTotalCount(Vendor),
      getTotalCount(Employee),
      getTotalCount(Bookings),
    ];

    const [totalUser, totalVendor, totalEmployee, totalBookings] =
      await Promise.all(totalCountPromises);

    res.status(200).json({
      token: token,
      adminId: loadedAdmin._id.toString(),
      name: loadedAdmin.name,
      email: loadedAdmin.email,
      verifyEmail: loadedAdmin.verifyEmail,
      phoneNo: loadedAdmin.phoneNo,
      verifyPhoneNo: loadedAdmin.verifyPhoneNo,
      gender: loadedAdmin.gender,
      totalBookings,
      totalEmployee,
      totalUser,
      totalVendor,
      message: "Admin logged in successfully",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

async function getTotalCount(Model) {
  try {
    const count = await Model.countDocuments();
    return count;
  } catch (err) {
    return 0; // Return 0 or handle the error appropriately
  }
}
