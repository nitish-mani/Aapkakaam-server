const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/admin");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/admin";
const email_admin = "aapkakaam5@gmail.com";

//////////////////////////////
//// for admin signup ////
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
  const email = req.body.email;
  const phoneNo = req.body.phoneNo;
  const password = req.body.password;

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
    else{
        res.status(404).json({message:"Not Authorized...Thanks..."})
    }
};

///////////////////////////////
//// for admin login //////
/////////////////////////////

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedadmin;
  Admin.findOne({ email: email })
    .then((admin) => {
      if (!admin) {
        const error = new Error("A admin with this email could not found.");
        error.statusCode = 401;
        throw error;
      }
      loadedadmin = admin;
      return bcrypt.compare(password, admin.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedadmin.email,
          adminId: loadedadmin._id.toString(),
        },
        secretKey,
        { expiresIn: "1h" }
      );
      res.status(200).json({
        token: token,
        adminId: loadedadmin._id.toString(),
        name: loadedadmin.name,
        email: loadedadmin.email,
        verifyEmail: loadedadmin.verifyEmail,
        phoneNo: loadedadmin.phoneNo,
        verifyPhoneNo: loadedadmin.verifyPhoneNo,
        gender: loadedadmin.gender,
        message: "Admin logged In Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
