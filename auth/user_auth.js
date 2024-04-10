const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const OtpAuth = require("../models/otpAuth");
const User = require("../models/user");
const Vendor = require("../models/vendor");
const Employee = require("../models/employee");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/user";

////////////////////////////
//// for user signup //////
///////////////////////////

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

    const userExists = await User.findOne({ email: email });
    if (userExists) {
      return res.status(401).json({ message: "Email already exists!" });
    }

    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      phoneNo,
      email,
      password: hashedPw,
      gender,
      verifyPhoneNo: verifiedNumber,
      verifyEmail: verifiedEmail,
      accountCreatedOn: new Date().toDateString(),
    });

    const result = await user.save();
    if (sharedBy && (cd === "user" || cd === "vendor")) {
      const Model = cd === "user" ? User : Vendor;
      const sharedUser = await Model.findById(sharedBy);
      if (sharedUser) {
        const balance = sharedUser.balance + 5;
        await Model.findByIdAndUpdate(sharedBy, {
          $push: {
            share: { name, phoneNo, date: new Date().toDateString() },
          },
          balance,
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
              date: new Date().getDate(),
              month: new Date().getMonth(),
              year: new Date().getFullYear(),
              time: new Date().toLocaleTimeString(),
            },
          },
          balance,
        });
      }
    }

    res.status(201).json({ message: "User created!", userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    console.log(err);
    next(err);
  }
};

///////////////////////////
//// for user login //////
//////////////////////////

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email could not found.");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        secretKey,
        { expiresIn: "72h" }
      );
      res.status(200).json({
        token: token,
        userId: loadedUser._id,
        name: loadedUser.name,
        email: loadedUser.email,
        verifyEmail: loadedUser.verifyEmail,
        phoneNo: loadedUser.phoneNo,
        verifyPhoneNo: loadedUser.verifyPhoneNo,
        balance: loadedUser.balance,
        address: loadedUser.address,
        gender: loadedUser.gender,
        imgURL: loadedUser.imgURL,
        message: "User logged In Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
