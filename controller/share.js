const Share = require("../models/share");

const share_controller_post = async (req, res, next) => {
  const userId = req.body.userId;
  const vendorId = req.body.vendorId;
  const employeeId = req.body.employeeId;
  const phoneNo = req.body.phoneNo;

  const date = new Date().toDateString();

  if (userId || vendorId || employeeId) {
    const share = await new Share({
      userId: userId,
      vendorId: vendorId,
      employeeId: employeeId,
      phoneNo,
      shareDate: date,
    });

    share
      .save()
      .then((result) => {
        res.status(200).json({ message: "Sharing Done..." });
      })
      .catch((err) =>
        res.status(200).json({ message: "Something Bad Happens..." })
      );
  }
};

const share_controller_get = (req, res, next) => {
  Share.find()
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

exports.share_controller_post = share_controller_post;
exports.share_controller_get = share_controller_get;
