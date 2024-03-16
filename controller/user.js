const { default: axios } = require("axios");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const OtpAuth = require("../models/otpAuth");
const bcrypt = require("bcryptjs");

const otp = () => Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

////////////////////////////////////
///// for Email Verification //////
//////////////////////////////////

exports.user_controller_verify_email = (req, res, next) => {
  const otpE = otp();
  const email = req.body.email;
  const otpId = req.body.otpId;

  // Function to send OTP via email

  OtpAuth.findById(otpId)
    .then((result) => {
      const otp = new OtpAuth({
        otp: otpE,
      });
      return otp.save().then((result) => {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          auth: {
            user: "nitishmani63@gmail.com",
            pass: "ivczvwwtjmeqlddu",
          },
        });

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
              res.status(200).json({
                message: "OTP sent on Email",
                verified: true,
                otpId: result._id,
              });
            }
          });
        }
        sendOTP(email, otpE);
      });
    })
    .catch((err) => console.log(err, "er"));
};

exports.user_controller_otpE = (req, res, next) => {
  const userOtp = req.body.emailOtp;
  const otpId = req.body.otpId;

  OtpAuth.findById(otpId)
    .then((result) => {
      if (result.otp == userOtp) {
        OtpAuth.findByIdAndUpdate(
          otpId,
          {
            verifiedEmail: true,
          },
          { returnDocument: "after" }
        ).then((result) => res.json({ message: "OTP verified", verify: true }));
      } else {
        res.json({ message: "invalid OTP", verify: false });
      }
    })
    .catch((err) => {
      res.status(404).json({ message: "Not authorized" });
    });
};

////////////////////////////////////////////
///// for Mobile Number Verification //////
//////////////////////////////////////////

exports.user_controller_verify_phoneNo = (req, res, next) => {
  const otpM = otp();
  const phoneNo = req.body.phoneNo;
  const otpId = req.body.otpId;

  OtpAuth.findById(otpId)
    .then((result) => {
      const otp = new OtpAuth({
        otp: otpM,
      });
      return otp.save().then((result) => {
        axios
          .get(
            `${process.env.FAST2SMS}&route=otp&variables_values=${otpM}&flash=0&numbers=${phoneNo}`
          )
          .then((succ) =>
            res.status(200).json({
              message: "OTP sent successfully",
              verified: true,
              otpId: result._id,
            })
          );
      });
    })
    .catch((err) => res.send(err.response.data));
};

exports.user_controller_otp = (req, res, next) => {
  const userOtp = req.body.otp;
  const otpId = req.body.otpId;

  OtpAuth.findById(otpId)
    .then((result) => {
      if (result.otp == userOtp) {
        OtpAuth.findByIdAndUpdate(
          otpId,
          { verifiedNumber: true },
          { returnDocument: "after" }
        ).then((result) => res.json({ message: "OTP verified", verify: true }));
      } else {
        res.json({ message: "invalid OTP", verify: false });
      }
    })
    .catch((err) => res.status(404).json({ message: "Not authorized" }));
};

///////////////////////////////////////
//// for updating user password //////
///////////////////////////////////////

exports.user_controller_patch_password = (req, res, next) => {
  const password = req.body.password;
  const email = req.body.email;
  const otpId = req.body.otpId;
  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedEmail)
        bcrypt
          .hash(password, 12)
          .then((hashPass) => {
            User.findOneAndUpdate(
              { email: email },
              { password: hashPass },
              { returnDocument: "after" }
            ).then((result) => {
              (verifiedEmail = false),
                res
                  .status(201)
                  .json({ message: "password changed successfully" });
            });
          })
          .catch((err) =>
            res.status(404).json({ message: "User with this Email Not found" })
          );
      else {
        res.status(404).json({ message: "Not verified user" });
      }
    })
    .catch((err) => {
      res.status(404).json({ message: "Not Authorized" });
    });
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
  const otpId = req.body.otpId;
  let loadedUser;
  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedNumber)
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
    })
    .catch((err) => {
      res.status(404).json({ message: "Not Authorized" });
    });
};
///////////////////////////////////////
///// for modifing user email //////
//////////////////////////////////////

exports.user_controller_patch_email = (req, res, next) => {
  const email = req.body.email;
  const userId = req.body.userId;
  const token = req.body.token;
  const otpId = req.body.otpId;
  let loadedUser;
  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedEmail)
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
    })
    .catch((err) => {
      res.status(404).json({ message: "Not Authorized" });
    });
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
