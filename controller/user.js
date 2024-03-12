const { default: axios } = require("axios");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

let verifiedNumber = false;
let verifiedEmail = false;
const otp = () => Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

////////////////////////////////////
///// for Email Verification //////
//////////////////////////////////
let otpE;
exports.user_controller_verify_email = (req, res, next) => {
  otpE = otp();
  const email = req.body.email;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: "nitishmani63@gmail.com",
      pass: "ivczvwwtjmeqlddu",
    },
  });

  // Function to send OTP via email
  function sendOTP(email, otp) {
    const mailOptions = {
      from: "aapkakaam19@yahoo.com",
      to: email,
      subject: "OTP Verification",
      text: `Your OTP for email verification is: ${otp}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.json(error);
      } else {
        res.json({ message: "OTP sent on Email", verified: true });
      }
    });
  }
  sendOTP(email, otpE);
};

exports.user_controller_otpE = (req, res, next) => {
  const userOtp = req.body.emailOtp;
  const otpd = otpE;
  if (otpd == userOtp) {
    verifiedEmail = true;
    res.json({ message: "otp verified", verify: true });
  } else {
    res.json({ message: "invalid otp", verify: false });
  }
};

////////////////////////////////////////////
///// for Mobile Number Verification //////
//////////////////////////////////////////
let otpM;
exports.user_controller_verify_phoneNo = (req, res, next) => {
  otpM = otp();
  const phoneNo = req.body.phoneNo;
  const otpd = otpM;

  axios
    .get(
      `${process.env.FAST2SMS}&route=otp&variables_values=${otpd}&flash=0&numbers=${phoneNo}`
    )
    .then((succ) => res.send(succ.data))
    .catch((err) => res.send(err.response.data));
};

exports.user_controller_otp = (req, res, next) => {
  const userOtp = req.body.otp;
  const otpd = otpM;
  if (otpd == userOtp) {
    verifiedNumber = true;
    res.json({ message: "otp verified", verify: true });
  } else {
    res.json({ message: "invalid otp", verify: false });
  }
};

///////////////////////////////////////
//// for updating vendor password //////
///////////////////////////////////////

exports.user_controller_patch_password = (req, res, next) => {
  const password = req.body.password;
  const email = req.body.email;

  if (verifiedEmail)
    bcrypt
      .hash(password, 12)
      .then((hashPass) => {
        User.findOneAndUpdate(
          { email: email },
          { password: hashPass },
          { returnDocument: "after" }
        )
          .then((result) => {
            (verifiedEmail = false),
              res
                .status(201)
                .json({ message: "password changed successfully" });
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  else {
    res.status(404).json({ message: "Not verified user" });
  }
};

///////////////////////////////////////
///// for updating user address //////
//////////////////////////////////////

exports.user_controller_patch_address = (req, res, next) => {
  const userId = req.body.userId;
  const token = req.body.token;

  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const state = req.body.state;
  const pincode = req.body.pincode;

  let loadedUser;
  User.findByIdAndUpdate(
    userId,
    { address: { vill, post, dist, state, pincode }, pincode: pincode },
    { returnDocument: "after" }
  )
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;

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
        message: "Address Updated Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for modifing user name //////
//////////////////////////////////////

exports.user_controller_patch_name = (req, res, next) => {
  const name = req.body.name;
  const userId = req.body.userId;
  const token = req.body.token;
  let loadedUser;
  User.findByIdAndUpdate(userId, { name }, { returnDocument: "after" })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
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
        message: "Name Updated Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for modifing user phoneNo //////
//////////////////////////////////////

exports.user_controller_patch_phoneNo = (req, res, next) => {
  const phoneNo = req.body.phoneNo;
  const userId = req.body.userId;
  const token = req.body.token;
  let loadedUser;
  if (verifiedNumber)
    User.findByIdAndUpdate(userId, { phoneNo }, { returnDocument: "after" })
      .then((result) => {
        if (!result) {
          const error = new Error("Could not find User.");
          error.statusCode = 404;
          throw error;
        }
        loadedUser = result;
        verifiedNumber = false;
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
          message: "Phone Number Updated Successfully ",
        });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  else {
    res.status(404).json({ message: "Not Verified User" });
  }
};
///////////////////////////////////////
///// for modifing user email //////
//////////////////////////////////////

exports.user_controller_patch_email = (req, res, next) => {
  const email = req.body.email;
  const userId = req.body.userId;
  const token = req.body.token;
  let loadedUser;
  if (verifiedEmail)
    User.findByIdAndUpdate(userId, { email }, { returnDocument: "after" })
      .then((result) => {
        if (!result) {
          const error = new Error("Could not find User.");
          error.statusCode = 404;
          throw error;
        }
        loadedUser = result;
        verifiedEmail = false;
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
          message: "Email Updated Successfully ",
        });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  else {
    res.status(404).json({ message: "Not Verified User" });
  }
};

///////////////////////////////////////
///// for getting user orders //////
//////////////////////////////////////

exports.user_controller_getOrders = (req, res, next) => {
  const userId = req.params.userId;

  let loadedUser;
  User.findOne({ _id: userId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
      res.status(200).json({ orders: loadedUser.orders });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting user share //////
//////////////////////////////////////

exports.user_controller_getShare = (req, res, next) => {
  const userId = req.params.userId;
  let loadedUser;
  User.findOne({ _id: userId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
      res.status(200).json({ share: loadedUser.share });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting user by user //////
//////////////////////////////////////

exports.user_controller_getUser = (req, res, next) => {
  const userId = req.params.userId;
  const token = req.get("Authorization").split(" ")[1];
  let loadedUser;
  User.findOne({ _id: userId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
      res.status(200).json({
        token: token,
        userId: loadedUser._id,
        name: loadedUser.name,
        email: loadedUser.email,
        verifyEmail: loadedUser.verifyEmail,
        phoneNo: loadedUser.phoneNo,
        verifyPhoneNo: loadedUser.verifyPhoneNo,
        balance: loadedUser.balance,
        gender: loadedUser.gender,
        address: loadedUser.address,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////////////////////////////////////
//// for getting user which are present in orderlist of vendor  //////
//////////////////////////////////////////////////////////////////////

exports.user_controller_getOne = async (req, res, next) => {
  const userId = req.params.userId;
  User.findOne({ _id: userId })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      res.json(result);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
