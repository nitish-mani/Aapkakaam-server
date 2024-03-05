const Bookings = require("../models/bookings");
const Vendor = require("../models/vendor");

const bookings_controller_post = async (req, res, next) => {
  const userId = req.body.userId;
  const vendorId = req.body.vendorId;
  const date = req.body.bookingDate;
  const type = req.body.type;
  const pincode = req.body.pincode;
  const bookedOn = new Date().toDateString();

  if (vendorId) {
    const bookings = await new Bookings({
      userId: userId,
      vendorId: vendorId,
      bookingDate: date,
      type: type,
      pincode: pincode,
      bookedOn,
    });

    bookings
      .save()
      .then((result) => {
        res.status(200).json({ message: "Bookings Done..." });
      })
      .catch((err) =>
        res.status(200).json({ message: "Something Bad Happens..." })
      );
  }
};

const bookings_controller_get = (req, res, next) => {
  const userId = req.params.userId;
  const orders = [];
  Bookings.find({ userId: userId })
    .populate("vendorId")
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find Orders.");
        error.statusCode = 404;
        throw error;
      }
      result.forEach((data) =>
        orders.push({
          name: data.vendorId.name,
          phoneNo: data.vendorId.phoneNo,
          type: data.type,
          date: data.bookingDate,
        })
      );

      res.json(orders);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.bookings_controller_get = bookings_controller_get;
exports.bookings_controller_post = bookings_controller_post;
