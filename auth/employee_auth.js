const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Employee = require("../models/employee");

//////////////////////////////
//// for employee signup ////
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
  const vill = req.body.vill;
  const post = req.body.post;
  const tahsil = req.body.tahsil;
  const dist = req.body.dist;
  const state = req.body.state;
  const pincode = req.body.pincode;

  Employee.findOne({ email: email }).then((resuslt) => {
    if (resuslt?.email)
      return res.status(401).json({ message: "Email already exist !" });
    bcrypt
      .hash(password, 12)
      .then((hashedPw) => {
        const employee = new Employee({
          name: name,
          phoneNo: phoneNo,
          email: email,
          password: hashedPw,
          vill: vill,
          post: post,
          tahsil: tahsil,
          dist: dist,
          state: state,
          pincode: pincode,
        });
        return employee.save();
      })
      .then((result) => {
        res
          .status(201)
          .json({ message: "Employee created!", employeeId: result._id });
      })
      .catch((err) => {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      });
  });
};

///////////////////////////////
//// for employee login //////
/////////////////////////////

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedEmployee;
  Employee.findOne({ email: email })
    .then((employee) => {
      if (!employee) {
        const error = new Error("A user with this email could not found.");
        error.statusCode = 401;
        throw error;
      }
      loadedEmployee = employee;
      return bcrypt.compare(password, employee.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedEmployee.email,
          employeeId: loadedEmployee._id.toString(),
        },
        "somesupersecretsecret",
        { expiresIn: "1h" }
      );
      res
        .status(200)
        .json({ token: token, employeeId: loadedEmployee._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
