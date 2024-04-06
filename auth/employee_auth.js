const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Employee = require("../models/employee");

const secretKey =
  "thisismyfirstcompanywhereweservepeopletommaketheirlifeeasy/employee";

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
        const error = new Error("A employee with this email could not found.");
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
        secretKey,
        { expiresIn: "72h" }
      );
      res.status(200).json({
        token: token,
        employeeId: loadedEmployee._id,
        name: loadedEmployee.name,
        email: loadedEmployee.email,
        verifyEmail: loadedEmployee.verifyEmail,
        phoneNo: loadedEmployee.phoneNo,
        verifyPhoneNo: loadedEmployee.verifyPhoneNo,
        balance: loadedEmployee.balance,
        address: loadedEmployee.address,
        gender: loadedEmployee.gender,
        message: "Employee logged In Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
