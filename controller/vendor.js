// const { Result } = require("express-validator");
const User = require("../models/user");
const Vendor = require("../models/vendor");
const Bookings = require("../models/bookings");
const OtpAuth = require("../models/otpAuth");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { sendNotification } = require("./singalMessaging");

const nodemailer = require("nodemailer");
const { default: axios } = require("axios");
const { TransitionStorageClass } = require("@aws-sdk/client-s3");

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
            user: "otp-verification@aapkakaam.com",
            pass: "jwonqzmtwkmlideu",
          },
        });

        function sendOTP(email, otp) {
          const mailOptions = {
            from: "otp-verification@aapkakaam.com",
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
    .catch((err) => res.json(err));
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
          )
          .catch((err) => res.send(err.response.data));
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

exports.vendor_controller_patch_password = async (req, res, next) => {
  try {
    const { password, email, otpId } = req.body;

    const otpDoc = await OtpAuth.findById(otpId);

    if (!otpDoc || !otpDoc.verifiedEmail) {
      return res
        .status(404)
        .json({ message: "Not authorized or not verified vendor." });
    }

    const hashPass = await bcrypt.hash(password, 12);

    const updatedVendor = await Vendor.findOneAndUpdate(
      { email: email },
      { password: hashPass },
      { returnDocument: "after" }
    );

    if (!updatedVendor) {
      return res
        .status(404)
        .json({ message: "Vendor with this Email Not found" });
    }

    res.status(201).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////////
//// for updating vendor address //////
///////////////////////////////////////

exports.vendor_controller_patch_address = (req, res, next) => {
  const vendorId = req.body.vendorId;

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
        name: loadedVendor.name,
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
              phoneNo: loadedVendor.phoneNo,
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
  const otpId = req.body.otpId;
  let loadedVendor;
  OtpAuth.findById(otpId)
    .then((result) => {
      if (result?.verifiedEmail)
        Vendor.findOne({ email: email }).then((resuslt) => {
          if (resuslt?.email)
            return res.status(401).json({ message: "Email already exist !" });

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
                email: loadedVendor.email,
                message: "Email Updated Successfully ",
              });
            })
            .catch((err) => {
              if (!err.statusCode) {
                err.statusCode = 500;
              }
              next(err);
            });
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
        wageRate: loadedVendor.wageRate,
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

exports.vendor_controller_getShare = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const skip = parseInt(req.params.skip) || 0; // Default skip to 0 if not provided
    const limit = 12; // Default limit to 12 if not provided

    // Retrieve vendor document
    const vendor = await Vendor.findOne({ _id: vendorId }).lean();

    if (!vendor) {
      const error = new Error("Could not find Vendor.");
      error.statusCode = 404;
      throw error;
    }

    // Reverse the share array and paginate
    const reversedShare = vendor.share.slice().reverse();
    const paginatedShare = reversedShare.slice(skip, skip + limit);

    res.status(200).json({ share: paginatedShare, total: vendor.share.length });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

///////////////////////////////////
//// for bookings by vendor //////
/////////////////////////////////

exports.vendor_controller_bookNowV = async (req, res, next) => {
  try {
    const {
      bookingId,
      vendorUser,
      name,
      phoneNo,
      vill,
      post,
      dist,
      pincode,
      date,
      month,
      year,
      isSelfBooking,
    } = req.body;
    const vendorId = req.params.vendorId;
    const bookingTime = Date.now();
    const bookingCost = 30;
    const vendor = await Vendor.findById(vendorId).select("balance fcmToken");
    const vendorUserDoc = await Vendor.findById(vendorUser).select(
      "bonusAmount"
    );

    if (!vendor || !vendorUserDoc) {
      return res
        .status(404)
        .json({ message: "Vendor or vendor user not found." });
    }

    if (isSelfBooking) {
    } else {
      if (
        vendor.balance < bookingCost ||
        vendorUserDoc.bonusAmount < bookingCost
      ) {
        return res.status(400).json({ message: "Insufficient balance." });
      }
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $push: {
          bookings: {
            bookingId,
            name,
            phoneNo,
            address: { vill, post, dist, pincode },
            date,
            month,
            year,
            cancelOrder: false,
            orderCompleted: false,
            bookingTime,
            cancelTime: "",
            rating: 0,
          },
        },
        $inc: { balance: isSelfBooking ? 0 : -bookingCost },
      },
      { new: true }
    );

    const updatedVendorUser = await Vendor.findByIdAndUpdate(
      vendorUser,
      { $inc: { bonusAmount: isSelfBooking ? 0 : -bookingCost } },
      { new: true }
    );
    try {
      sendNotification(
        vendor.fcmToken,
        `...You are Booked...`,
        bookingId,
        `Booking Done by ${name.toUpperCase()} on { ${date}/${
          month + 1
        }/${year} }`,
        "booking",
        month.toString(),
        year.toString()
      );
    } catch (err) {
      console.error("Notification failed", err);
    }

    res.status(200).json({
      message: "Booking Done..!",
      bonusAmount: updatedVendorUser.bonusAmount,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////
//// for bookings by user //////
/////////////////////////////////

exports.vendor_controller_bookNowU = async (req, res, next) => {
  try {
    const {
      bookingId,
      userId,
      name,
      phoneNo,
      vill,
      post,
      dist,
      pincode,
      date,
      month,
      year,
    } = req.body;
    const vendorId = req.params.vendorId;

    const bookingTime = Date.now();
    const bookingCost = 30;

    const vendor = await Vendor.findById(vendorId).select("balance fcmToken");
    const user = await User.findById(userId).select("bonusAmount");

    if (!vendor || !user) {
      return res.status(404).json({ message: "Vendor or user not found." });
    }

    if (vendor.balance < bookingCost || user.bonusAmount < bookingCost) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $push: {
          bookings: {
            bookingId,
            name,
            phoneNo,
            address: { vill, post, dist, pincode },
            date,
            month,
            year,
            cancelOrder: false,
            orderCompleted: false,
            bookingTime,
            cancelTime: "",
            rating: 0,
          },
        },
        $inc: { balance: -bookingCost },
      },
      { new: true }
    );

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { bonusAmount: -bookingCost } },
      { new: true }
    );
    // Send notification
    try {
      sendNotification(
        vendor.fcmToken,
        `...You are Booked...`,
        bookingId,
        `Booking Done by ${name.toUpperCase()} on { ${date}/${
          month + 1
        }/${year} }`,
        "booking",
        month.toString(),
        year.toString()
      );
    } catch (err) {
      console.error("Notification failed", err);
    }

    res.status(200).json({
      message: "Booking Done..!",
      bonusAmount: updatedUser.bonusAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//////////////////////////////////////
//// to get bookings by vendor //////
////////////////////////////////////

exports.vendor_controller_getBookings = async (req, res, next) => {
  try {
    const vendorId = req.params.vendorId;
    const year = parseInt(req.params.year); // Filter by year
    const month = parseInt(req.params.month); // Filter by month

    // console.log(vendorId, year, month);
    let pipeline = [
      {
        $match: {
          _id: new ObjectId(vendorId),
        },
      },
      {
        $unwind: "$bookings",
      },
      {
        $addFields: {
          bookingYear: "$bookings.year",
          bookingMonth: "$bookings.month",
        },
      },
      {
        $match: {
          bookingYear: year,
          bookingMonth: month,
        },
      },
      {
        $project: {
          _id: 0,
          booking: "$bookings",
        },
      },
    ];

    const vendor = (await Vendor.aggregate(pipeline)).reverse();

    if (!vendor || vendor.length === 0) {
      return res.status(200).json({
        data: [],
        message:
          "Could not find Vendor bookings for the specified month and year.",
      });
    }
    // console.log(vendor);

    res.status(200).json(vendor);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

///////////////////////////////////////
///// for getting vendor by vendor //////
//////////////////////////////////////

exports.vendor_controller_getVendor = (req, res, next) => {
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
      res.status(200).json({
        rating: loadedVendor.rating,
        ratingCount: loadedVendor.ratingCount,
        balance: loadedVendor.balance,
        bonusAmount: loadedVendor.bonusAmount,
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

exports.vendor_controller_getAll = async (req, res, next) => {
  try {
    const type = req.params.type;
    const pincode = req.params.pincode;
    const bookingDate = new Date(req.params.bookingDate).toDateString();
    const limit = 12;
    const page = parseInt(req.params.page) || 1;
    const minRating = parseFloat(req.params.minRating) || 0;
    const minWageRate = parseFloat(req.params.minWageRate) || 0;

    // 1. Get vendorIds with confirmed bookings (not cancelled)
    const bookedVendorIds = await Bookings.distinct("vendorId", {
      type,
      pincode,
      bookingDate,
      cancelOrder: { $ne: true },
    });
    // 2. Build dynamic matchStage
    const matchStage = {
      type,
      pincode,
      balance: { $gte: 25 },
      wageRate: { $exists: true, $gte: minWageRate },
      rating: { $gte: minRating },
    };

    // Only exclude booked vendorIds if any exist
    if (bookedVendorIds.length > 0) {
      matchStage._id = { $nin: bookedVendorIds };
    }

    const skip = (page - 1) * limit;

    const [vendors, totalCount] = await Promise.all([
      Vendor.aggregate([
        { $match: matchStage },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            gender: 1,
            phoneNo: {
              $toString: "$phoneNo",
            },
            rating: 1,
            ratingCount: 1,
            wageRate: 1,
            profilePic: 1,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            gender: 1,
            phoneNo: {
              $let: {
                vars: {
                  len: { $strLenBytes: "$phoneNo" },
                },
                in: {
                  $concat: [
                    { $substrBytes: ["$phoneNo", 0, 2] },
                    "******",
                    {
                      $substrBytes: [
                        "$phoneNo",
                        { $subtract: ["$$len", 2] },
                        2,
                      ],
                    },
                  ],
                },
              },
            },
            rating: 1,
            ratingCount: 1,
            wageRate: 1,
            profilePic: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]),

      Vendor.countDocuments(matchStage),
    ]);
    res.status(200).json({
      total: totalCount,
      vendors,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
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
