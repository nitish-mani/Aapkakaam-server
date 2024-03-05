const Employee = require("../models/employee");

const employee_controller_get = (req, res, next) => {
  Employee.find()
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

exports.employee_controller_get = employee_controller_get;
