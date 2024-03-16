// const { Result } = require("express-validator");
const User = require("../models/user");
const Vendor = require("../models/vendor");
const Bookings = require("../models/bookings");
const OtpAuth = require("../models/otpAuth");
const bcrypt = require("bcryptjs");

const nodemailer = require("nodemailer");
const { default: axios } = require("axios");

const otp = () => Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

////////////////////////////////////
///// for Email Verification //////
//////////////////////////////////

exports.vendor_controller_verify_email = (req, res, next) => {
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

exports.vendor_controller_otpE = (req, res, next) => {
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

exports.vendor_controller_verify_phoneNo = (req, res, next) => {
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

exports.vendor_controller_otp = (req, res, next) => {
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
//// for updating vendor password //////
///////////////////////////////////////

exports.vendor_controller_patch_password = (req, res, next) => {
  const password = req.body.password;
  const email = req.body.email;
  const otpId = req.body.otpId;

  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedEmail)
        bcrypt.hash(password, 12).then((hashPass) => {
          Vendor.findOneAndUpdate(
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
            .catch((err) =>
              res
                .status(404)
                .json({ message: "Vendor with this Email Not found" })
            );
        });
      else {
        res.status(404).json({ message: "Not verified vendor" });
      }
    })
    .catch((err) => {
      res.status(404).json({ message: "Not Authorized" });
    });
};

///////////////////////////////////////
//// for updating vendor address //////
///////////////////////////////////////

exports.vendor_controller_patch_address = (req, res, next) => {
  const vendorId = req.body.vendorId;
  const token = req.body.token;

  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const state = req.body.state;
  const pincode = req.body.pincode;

  let loadedVendor;

  Vendor.findByIdAndUpdate(
    vendorId,
    { address: { vill, post, dist, state, pincode }, pincode: pincode },
    { returnDocument: "after" }
  )
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      loadedVendor = result;
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
        balance: loadedVendor.balance,
        address: loadedVendor.address,
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
///// for modifing vendor name //////
//////////////////////////////////////

exports.vendor_controller_patch_name = (req, res, next) => {
  const name = req.body.name;
  const vendorId = req.body.vendorId;
  const token = req.body.token;
  let loadedVendor;
  Vendor.findByIdAndUpdate(vendorId, { name }, { returnDocument: "after" })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      loadedVendor = result;
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
        balance: loadedVendor.balance,
        address: loadedVendor.address,
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
///// for modifing vendor phoneNo //////
//////////////////////////////////////

exports.vendor_controller_patch_phoneNo = (req, res, next) => {
  const phoneNo = req.body.phoneNo;
  const vendorId = req.body.vendorId;
  const token = req.body.token;
  const otpId = req.body.otpId;
  let loadedVendor;
  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedNumber)
        Vendor.findByIdAndUpdate(
          vendorId,
          { phoneNo },
          { returnDocument: "after" }
        )
          .then((result) => {
            if (!result) {
              const error = new Error("Could not find Vendor.");
              error.statusCode = 404;
              throw error;
            }
            loadedVendor = result;
            verifiedNumber = false;
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
              balance: loadedVendor.balance,
              address: loadedVendor.address,
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
        res.status(404).json({ message: "Not Verified Vendor" });
      }
    })
    .catch((err) => {
      res.status(404).json({ message: "Not Authorized" });
    });
};
///////////////////////////////////////
///// for modifing vendor email //////
//////////////////////////////////////

exports.vendor_controller_patch_email = (req, res, next) => {
  const email = req.body.email;
  const vendorId = req.body.vendorId;
  const token = req.body.token;
  const otpId = req.body.otpId;
  let loadedVendor;
  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedEmail)
        Vendor.findByIdAndUpdate(
          vendorId,
          { email },
          { returnDocument: "after" }
        )
          .then((result) => {
            if (!result) {
              const error = new Error("Could not find Vendor.");
              error.statusCode = 404;
              throw error;
            }
            loadedVendor = result;
            verifiedEmail = false;
            res.status(200).json({
              token: token,
              vendorId: loadedVendor._id,
              name: loadedVendor.name,
              email: loadedVendor.email,
              verifyEmail: loadedVendor.verifyEmail,
              phoneNo: loadedVendor.phoneNo,
              verifyPhoneNo: loadedVendor.verifyPhoneNo,
              type: loadedVendor.type,
              rating: loadedVendor.rating,
              ratingCount: loadedVendor.ratingCount,
              wageRate: loadedVendor.wageRate,
              gender: loadedVendor.gender,
              balance: loadedVendor.balance,
              address: loadedVendor.address,
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
        res.status(404).json({ message: "Not Verified Vendor" });
      }
    })
    .catch((err) => {
      res.status(404).json({ message: "Not Authorized" });
    });
};

///////////////////////////////////////////
///// for modifing vendor wage rate //////
/////////////////////////////////////////

exports.vendor_controller_patch_wageRate = (req, res, next) => {
  const wageRate = req.body.wageRate;
  const vendorId = req.body.vendorId;
  const token = req.body.token;
  let loadedVendor;
  Vendor.findByIdAndUpdate(vendorId, { wageRate }, { returnDocument: "after" })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      loadedVendor = result;
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
        balance: loadedVendor.balance,
        address: loadedVendor.address,
        message: "Wage Rate Updated Successfully ",
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
///// for getting vendor orders //////
//////////////////////////////////////

exports.vendor_controller_getOrders = (req, res, next) => {
  const vendorId = req.params.vendorId;

  let loadedVendor;
  Vendor.findOne({ _id: vendorId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      loadedVendor = result;
      res.status(200).json({ orders: loadedVendor.orders });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting vendor share //////
//////////////////////////////////////

exports.vendor_controller_getShare = (req, res, next) => {
  const vendorId = req.params.vendorId;
  let loadedVendor;
  Vendor.findOne({ _id: vendorId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      loadedVendor = result;
      res.status(200).json({ share: loadedVendor.share });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////
//// for bookings by vendor //////
/////////////////////////////////

exports.vendor_controller_bookNowV = (req, res, next) => {
  const vendorId = req.params.vendorId;

  const bookingId = req.body.bookingId;
  const vendorUser = req.body.vendorId;
  const name = req.body.name;
  const phoneNo = req.body.phoneNo;
  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const pincode = req.body.pincode;
  const date = req.body.date;
  const month = req.body.month;
  const year = req.body.year;
  const bookingTime = Date.now();

  Vendor.findById(vendorId)
    .then((result) => {
      let balance = result.balance - 5;
      Vendor.findByIdAndUpdate(
        vendorId,
        {
          $push: {
            bookings: {
              bookingId,
              name: name,
              phoneNo: phoneNo,
              address: { vill: vill, post: post, dist: dist, pincode },
              date: date,
              month: month,
              year: year,
              cancelOrder: false,
              orderCompleted: false,
              bookingTime,
              cancelTime: "",
              rating: 0,
            },
          },
          balance,
        },
        { returnDocument: "after" }
      ).then((suc) => {
        Vendor.findById(vendorUser).then((result) => {
          let balance = result.balance - 5;

          Vendor.findByIdAndUpdate(
            vendorUser,
            {
              balance,
            },
            { returnDocument: "after" }
          )
            .then((suc) => {
              res.status(200).json({ message: "Booking Done..!" });
            })
            .catch((err) => console.log(err, "er"));
        });
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////
//// for bookings by user //////
/////////////////////////////////

exports.vendor_controller_bookNowU = (req, res, next) => {
  const vendorId = req.params.vendorId;

  const bookingId = req.body.bookingId;
  const userId = req.body.userId;
  const name = req.body.name;
  const phoneNo = req.body.phoneNo;
  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const pincode = req.body.pincode;
  const date = req.body.date;
  const month = req.body.month;
  const year = req.body.year;
  const bookingTime = Date.now();
  Vendor.findById(vendorId)
    .then((result) => {
      let balance = result.balance - 5;
      Vendor.findByIdAndUpdate(
        vendorId,
        {
          $push: {
            bookings: {
              bookingId,
              name: name,
              phoneNo: phoneNo,
              address: { vill: vill, post: post, dist: dist, pincode },
              date: date,
              month: month,
              year: year,
              cancelOrder: false,
              orderCompleted: false,
              bookingTime,
              cancelTime: "",
              rating: 0,
            },
          },
          balance,
        },
        { returnDocument: "after" }
      ).then((suc) => {
        User.findOne({ _id: userId }).then((result) => {
          let balance = result.balance - 5;
          User.findByIdAndUpdate(
            userId,
            {
              balance,
            },
            { returnDocument: "after" }
          )
            .then((suc) => res.status(200).json({ message: "Booking Done..!" }))
            .catch((err) => console.log(err));
        });
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

//////////////////////////////////////
//// to get bookings by vendor //////
////////////////////////////////////

exports.vendor_controller_getBookings = (req, res, next) => {
  const vendorId = req.params.vendorId;
  const bookings = [];
  Vendor.findOne({ _id: vendorId })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      result.bookings.map((data) => {
        bookings.push(data);
      });

      res.status(200).json(bookings);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting vendor by vendor //////
//////////////////////////////////////

exports.vendor_controller_getVendor = (req, res, next) => {
  const vendorId = req.params.vendorId;
  const token = req.get("Authorization").split(" ")[1];
  let loadedVendor;
  Vendor.findOne({ _id: vendorId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }
      loadedVendor = result;
      res.status(200).json({
        token: token,
        vendorId: loadedVendor._id,
        name: loadedVendor.name,
        email: loadedVendor.email,
        verifyEmail: loadedVendor.verifyEmail,
        phoneNo: loadedVendor.phoneNo,
        verifyPhoneNo: loadedVendor.verifyPhoneNo,
        gender: loadedVendor.gender,
        type: loadedVendor.type,
        rating: loadedVendor.rating,
        ratingCount: loadedVendor.ratingCount,
        wageRate: loadedVendor.wageRate,
        balance: loadedVendor.balance,
        address: loadedVendor.address,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////////
//// for getting all vendor by user //////
//////////////////////////////////////////

exports.vendor_controller_getAll = (req, res, next) => {
  const type = req.params.type;
  const pincode = req.params.pincode;
  const bookingDate = req.params.bookingDate;

  const vendorList = new Set();
  const userGetVendor = [];
  Bookings.find({
    type: type,
    pincode: pincode,
    bookingDate: bookingDate,
  })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }

      result.forEach((data) => {
        if (!data.cancelOrder && data.vendorId)
          vendorList.add(data.vendorId?.toString());
      });

      Vendor.find({ type: type, pincode: pincode }).then((result) => {
        result.forEach((data) => {
          if (!vendorList.has(data._id?.toString()) && data.wageRate) {
            const phoneNo = data.phoneNo.toString();
            const maskedNumber =
              phoneNo.substring(0, 2) + "*".repeat(6) + phoneNo.substring(8);

            userGetVendor.push({
              vendorId: data._id,
              name: data.name,
              type: data.type,
              gender: data.gender,
              phoneNo: maskedNumber,
              rating: data.rating,
              ratingCount: data.ratingCount,
              wageRate: data.wageRate,
            });
          }
        });
        res.status(200).json(userGetVendor);
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
//// for getting vendor which are present in orderlist of user  //////
//////////////////////////////////////////////////////////////////////

exports.vendor_controller_getOne = (req, res, next) => {
  const vendorId = req.params.vendorId;
  Vendor.find({ _id: vendorId })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
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
