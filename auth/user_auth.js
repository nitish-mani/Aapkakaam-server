const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Vendor = require("../models/vendor");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/user";

////////////////////////////
//// for user signup //////
///////////////////////////

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
  const gender = req.body.gender;
  const sharedBy = req.body.sharedBy;
  const cd = req.body.cd;

  User.findOne({ email: email }).then((resuslt) => {
    if (resuslt?.email)
      return res.status(401).json({ message: "Email already exist !" });
    bcrypt
      .hash(password, 12)
      .then((hashedPw) => {
        const user = new User({
          name: name,
          phoneNo: phoneNo,
          email: email,
          password: hashedPw,
          gender: gender,
          accountCreatedOn: new Date().toDateString(),
        });
        return user.save();
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
        res.status(201).json({ message: "User created!", userId: result._id });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  });
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
        gender: loadedVendor.gender,
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
