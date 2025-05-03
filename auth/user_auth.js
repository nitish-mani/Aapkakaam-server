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
      fcmToken,
      validPhoneNoId,
      validEmailId,
    } = req.body;

    if (password.length < 6) {
      return res.status(401).json({
        message: "Password must be at least 6 characters long ",
      });
    }

    // const [checkPhoneNoValid] = await Promise.all([
    //   OtpAuth.findById(validPhoneNoId).select("verifiedNumber"),
    //   OtpAuth.findById(validEmailId).select("verifiedEmail"),
    // ]);
    // const verifiedEmail = checkEmailValid?.verifiedEmail;
    // const verifiedNumber = checkPhoneNoValid?.verifiedNumber;

    // if (!checkPhoneNoValid || !checkPhoneNoValid.verifiedNumber) {
    //   return res.status(401).json({ message: "Number not verified" });
    // }

    const userExists = await User.findOne({ phoneNo: phoneNo });
    if (userExists) {
      return res.status(401).json({ message: "Mobile Number already exists!" });
    }

    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      phoneNo,
      email,
      password: hashedPw,
      gender,
      // fcmToken: fcmToken,
      // verifyPhoneNo: verifiedNumber,
      // verifyEmail: verifiedEmail,
      accountCreatedOn: new Date().toDateString(),
    });

    const result = await user.save();
    if (sharedBy && (cd === "user" || cd === "vendor")) {
      const Model = cd === "user" ? User : Vendor;
      const sharedUser = await Model.findById(sharedBy);
      if (sharedUser) {
        const balance = sharedUser.bonusAmount + 30;
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
              category: "user",
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

    res.status(200).json({ message: "User created!", userId: result._id });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////
//// for user login //////
//////////////////////////

exports.login = (req, res, next) => {
  const phoneNo = req.body.phoneNo;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ phoneNo: phoneNo })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this phoneNo could not found.");
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
          phoneNo: loadedUser.phoneNo,
          userId: loadedUser._id.toString(),
        },
        secretKey,
        { expiresIn: "72h" }
      );
      User.findByIdAndUpdate(loadedUser._id, {
        fcmToken: req.body.fcmToken,
      });
      res.status(200).json({
        token: token,
        userId: loadedUser._id,
        name: loadedUser.name,
        email: loadedUser.email,
        verifyEmail: loadedUser.verifyEmail,
        phoneNo: loadedUser.phoneNo,
        verifyPhoneNo: loadedUser.verifyPhoneNo,
        bonusAmount: loadedUser.bonusAmount,
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
