// const { Result } = require("express-validator");
const Vendor = require("../models/vendor");
const Bookings = require("../models/bookings");

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
  let loadedVendor;
  Vendor.findByIdAndUpdate(vendorId, { phoneNo }, { returnDocument: "after" })
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
};
///////////////////////////////////////
///// for modifing vendor email //////
//////////////////////////////////////

exports.vendor_controller_patch_email = (req, res, next) => {
  const email = req.body.email;
  const vendorId = req.body.vendorId;
  const token = req.body.token;
  let loadedVendor;
  Vendor.findByIdAndUpdate(vendorId, { email }, { returnDocument: "after" })
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

exports.vendor_controller_bookNow = (req, res, next) => {
  const vendorId = req.params.vendorId;

  const name = req.body.name;
  const phoneNo = req.body.phoneNo;
  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const pincode = req.body.pincode;
  const date = req.body.date;
  const month = req.body.month;
  const year = req.body.year;

  Vendor.findByIdAndUpdate(
    vendorId,
    {
      $push: {
        bookings: {
          name: name,
          phoneNo: phoneNo,
          address: { vill: vill, post: post, dist: dist, pincode },
          date: date,
          month: month,
          year: year,
        },
      },
    },
    { returnDocument: "after" }
  )
    .then((suc) => res.status(200).json({ message: "Booking Done..!" }))
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

  const name = req.body.name;
  const phoneNo = req.body.phoneNo;
  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const pincode = req.body.pincode;
  const date = req.body.date;
  const month = req.body.month;
  const year = req.body.year;

  Vendor.findByIdAndUpdate(
    vendorId,
    {
      $push: {
        bookings: {
          name: name,
          phoneNo: phoneNo,
          address: { vill: vill, post: post, dist: dist, pincode },
          date: date,
          month: month,
          year: year,
        },
      },
    },
    { returnDocument: "after" }
  )
    .then((suc) => res.status(200).json({ message: "Booking Done..!" }))
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
  Bookings.find({ type: type, pincode: pincode, bookingDate: bookingDate })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Vendor.");
        error.statusCode = 404;
        throw error;
      }

      result.forEach((data) => {
        if (data.vendorId) vendorList.add(data.vendorId?.toString());
      });

      Vendor.find({ type: type, pincode: pincode }).then((result) => {
        result.forEach((data) => {
          if (!vendorList.has(data._id?.toString())) {
            userGetVendor.push({
              vendorId: data._id,
              name: data.name,
              phoneNo: data.phoneNo,
              type: data.type,
              gender: data.gender,
              ratings: data.ratings,
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
