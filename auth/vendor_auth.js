const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Vendor = require("../models/vendor");
const User = require("../models/user");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/vendor";

//////////////////////////////
//// for vendor signup //////
/////////////////////////////

exports.signup = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const name = req.body.name;
  const phoneNo = req.body.phoneNo;
  const email = req.body.email;
  const password = req.body.password;
  const type = req.body.type;
  const gender=req.body.gender;
  const sharedBy = req.body.sharedBy;
  const cd = req.body.cd;

  Vendor.findOne({ email: email }).then((resuslt) => {
    if (resuslt?.email)
      return res.status(401).json({ message: "Email already exist !" });

    bcrypt
      .hash(password, 12)
      .then((hashedPw) => {
        const vendor = new Vendor({
          name: name,
          phoneNo: phoneNo,
          email: email,
          password: hashedPw,
          type: type,
          gender:gender,
          accountCreatedOn: new Date().toDateString(),
        });
        return vendor.save();
      })
      .then((result) => {
        if (sharedBy && cd === "user")
          User.findOne({ _id: sharedBy }).then((result) => {
            let balance = result.balance + 5;

            User.findByIdAndUpdate(
              sharedBy,
              {
                $push: {
                  share: { name, phoneNo, date: new Date().toDateString() },
                },
                balance,
              },
              { returnDocument: "after" }
            ).then((suc) => console.log(suc));
          });
        else if (sharedBy && cd === "vendor")
          Vendor.findOne({ _id: sharedBy }).then((result) => {
            let balance = result.balance + 5;

            Vendor.findByIdAndUpdate(
              sharedBy,
              {
                $push: {
                  share: { name, phoneNo, date: new Date().toDateString() },
                },
                balance,
              },
              { returnDocument: "after" }
            ).then((suc) => console.log(suc));
          });
        res
          .status(201)
          .json({ message: "Vendor created!", vendorId: result._id });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  });
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
        address: loadedVendor.address,
        balance: loadedVendor.balance,
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
