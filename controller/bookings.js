const Bookings = require("../models/bookings");
const Vendor = require("../models/vendor");
const User = require("../models/user");
const { ObjectId } = require("mongodb");
const { sendNotification } = require("./singalMessaging");

exports.bookings_controller_postU = async (req, res, next) => {
  try {
    const { userId, vendorId, bookingDate, type, pincode } = req.body;
    const formattedBookingDate = new Date(bookingDate).toDateString();
    const bookedOn = new Date().toDateString();
    const bookingTime = Date.now();

    const vendor = await Vendor.findById(vendorId).select("balance");
    const user = await User.findById(userId).select("bonusAmount");

    if (!user || user.bonusAmount < 30 || !vendor || vendor.balance < 30) {
      return res
        .status(302)
        .json({ message: "You don't have enough balance for booking" });
    }

    const bookings = new Bookings({
      userId,
      vendorId,
      bookingDate: formattedBookingDate,
      type,
      pincode,
      bookedOn,
      cancelOrder: false,
      orderCompleted: false,
      rating: 0,
      bookingTime,
    });

    const result = await bookings.save();
    res.status(200).json({ bookingId: result._id });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_postV = async (req, res, next) => {
  try {
    const { userId, vendorId, bookingDate, type, pincode, isSelfBooking } =
      req.body;
    const formattedBookingDate = new Date(bookingDate).toDateString();
    const bookedOn = new Date().toDateString();
    const bookingTime = Date.now();

    const vendor = await Vendor.findById(vendorId).select("balance");
    const vendorUser = await Vendor.findById(userId).select("bonusAmount");

    if (isSelfBooking) {
      const bookings = new Bookings({
        userId,
        vendorId,
        bookingDate: formattedBookingDate,
        type,
        pincode,
        bookedOn,
        cancelOrder: false,
        orderCompleted: false,
        rating: 0,
        bookingTime,
      });

      const result = await bookings.save();
      return res.status(200).json({ bookingId: result._id });
    }

    if (
      !vendorUser ||
      vendorUser.bonusAmount < 30 ||
      !vendor ||
      vendor.balance < 30
    ) {
      return res
        .status(302)
        .json({ message: "You don't have enough balance for booking" });
    }

    const bookings = new Bookings({
      userId,
      vendorId,
      bookingDate: formattedBookingDate,
      type,
      pincode,
      bookedOn,
      cancelOrder: false,
      orderCompleted: false,
      rating: 0,
      bookingTime,
    });

    const result = await bookings.save();
    res.status(200).json({ bookingId: result._id });
  } catch (err) {
    // Log the error for debugging
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_get = async (req, res, next) => {
  try {
    const userId = new ObjectId(req.params.userId);
    const page = parseInt(req.params.pageNo) || 1; // Default to page 1 if not provided
    const pageSize = 12; // Default page size to 12 if not provided

    const currentDate = new Date().getTime();

    // Calculate the total number of records to skip
    const totalRecords = await Bookings.countDocuments({ userId });
    const skip = Math.max(0, totalRecords - page * pageSize);

    const orders = await Bookings.aggregate([
      {
        $match: {
          userId: userId,
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendorId",
          foreignField: "_id",
          as: "vendor",
        },
      },
      {
        $addFields: {
          bookingDateMillis: { $toLong: { $toDate: "$bookingDate" } }, // Convert bookingDate to milliseconds
          currentDateMillis: currentDate, // Store current date in milliseconds
        },
      },
      {
        $project: {
          bookingId: "$_id",
          name: { $arrayElemAt: ["$vendor.name", 0] },
          phoneNo: {
            $cond: {
              if: { $isArray: "$vendor.phoneNo" },
              then: { $toString: { $arrayElemAt: ["$vendor.phoneNo", 0] } }, // Take the first element if it's an array
              else: { $toString: "$vendor.phoneNo" }, // Convert to string if it's not an array
            },
          },
          type: 1,
          date: "$bookingDate",
          cancelOrder: 1,
          orderCompleted: 1,
          rating: 1,
        },
      },
      {
        $project: {
          bookingId: 1,
          name: 1,
          phoneNo: {
            $cond: {
              if: {
                $and: [
                  { $lt: ["$bookingDateMillis", "$currentDateMillis"] }, // Check if booking is in the past
                  { $eq: ["$$ROOT.cancelOrder", false] }, // Additional condition: Check if cancelOrder is false
                  { $eq: ["$rating", 0] },
                ],
              },
              then: "$phoneNo",

              else: {
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
            },
          },
          type: 1,
          date: 1,
          cancelOrder: 1,
          orderCompleted: 1,
          rating: 1,
        },
      },
      {
        $skip: skip, // Skip records based on query parameter
      },
      {
        $limit: pageSize, // Limit the number of records based on query parameter
      },
    ]);
    res.json({
      page,
      total: orders.length, // You may want to fetch the total count separately if needed
      orders: orders,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_cancelU = async (req, res, next) => {
  try {
    const bookingId = req.body.bookingId;
    const cancelTime = Date.now();

    // Find the booking by ID
    const booking = await Bookings.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const { orderCompleted, vendorId, userId, bookingDate } = booking;
    const result = new Date(bookingDate);
    const date = result.getDate().toString(); // Day of month (1-31)
    const month = (result.getMonth() + 1).toString(); // Month (1-12)
    const year = result.getFullYear().toString();

    if (orderCompleted) {
      return res.status(301).json({
        message: "You can't cancel this order. This is already completed",
      });
    }

    // Update the booking to mark it as canceled
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { cancelOrder: true, cancelTime },
      { new: true }
    );

    // Find the vendor by ID and update the booking status
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $set: {
          "bookings.$[elem].cancelOrder": true,
          "bookings.$[elem].cancelTime": cancelTime,
        },
      },
      { arrayFilters: [{ "elem.bookingId": bookingId }], new: true }
    );

    // Update the vendor's balance
    // const updatedVendorB = await Vendor.findByIdAndUpdate(
    //   vendorId,
    //   { $inc: { balance: 30 } }, // Increment balance by 30
    //   { new: true }
    // );

    // Update the user's balance
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { bonusAmount: 25 } }, // Increment balance by 25
      { new: true }
    );
    try {
      sendNotification(
        updatedVendor.fcmToken,
        `...You are Canceled...`,
        bookingId,
        `Canceled by ${updatedUser.name.toUpperCase()} for { ${date}/${month}/${year} }`,
        "cancelled",
        month,
        year
      );
    } catch (err) {
      console.error("Notification failed", err);
    }

    return res.status(200).json({
      message: "Order Canceled",
      bonusAmount: updatedUser.bonusAmount,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_cancelV = async (req, res, next) => {
  try {
    const bookingId = req.body.bookingId;
    const cancelTime = Date.now();

    // Find the booking by ID
    const booking = await Bookings.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { orderCompleted, vendorId, userId, bookingDate } = booking;
    const result = new Date(bookingDate);
    const date = result.getDate().toString(); // Day of month (1-31)
    const month = (result.getMonth() + 1).toString(); // Month (1-12)
    const year = result.getFullYear().toString();
    if (orderCompleted) {
      return res.status(301).json({
        message: "You can't cancel this order. This is already completed",
      });
    }

    // Update the booking to mark it as canceled
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { cancelOrder: true, cancelTime },
      { new: true }
    );

    // Find the vendor by ID and update the booking status
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $set: {
          "bookings.$[elem].cancelOrder": true,
          "bookings.$[elem].cancelTime": cancelTime,
        },
      },
      { arrayFilters: [{ "elem.bookingId": bookingId }], new: true }
    );

    // Update the vendor's balance
    // const updatedVendorB = await Vendor.findByIdAndUpdate(
    //   vendorId,
    //   { $inc: { balance: 30 } }, // Increment balance by 30
    //   { new: true }
    // );

    // Update the vendorUser's balance
    const updatedVendorUser = await Vendor.findByIdAndUpdate(
      userId,
      { $inc: { bonusAmount: 25 } }, // Increment balance by 25
      { new: true }
    );
    try {
      sendNotification(
        updatedVendor.fcmToken,
        `...You are Canceled...`,
        bookingId,
        `Canceled by ${updatedVendorUser.name.toUpperCase()} for { ${date}/${month}/${year} }`,
        "cancelled",
        month,
        year
      );
    } catch (err) {
      console.error("Notification failed", err);
    }

    return res
      .status(200)
      .json({ message: "Order Canceled", balance: updatedVendorUser.balance });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_completeU = async (req, res, next) => {
  try {
    const bookingId = req.body.bookingId;

    // Find the booking by ID, including the vendor and user details
    const booking = await Bookings.findById(bookingId)
      .populate("vendorId")
      .populate("userId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { cancelOrder, bookingDate, vendorId, userId } = booking;

    const bookingTime = new Date(bookingDate).getTime();
    const currentTime = Date.now();

    if (cancelOrder) {
      return res.status(301).json({
        message:
          "You can't mark this Order as completed. This is already canceled",
      });
    }

    if (currentTime <= bookingTime) {
      return res.status(301).json({
        message: `You can't mark this Order as completed before ${bookingDate}`,
      });
    }

    // Update the booking to mark it as completed
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { orderCompleted: true },
      { new: true }
    );

    // Update the vendor's bookings array to reflect the completed status
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { "bookings.$[elem].orderCompleted": true } },
      { arrayFilters: [{ "elem.bookingId": bookingId }], new: true }
    );

    return res
      .status(200)
      .json({ message: "Marked as completed successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_completeV = async (req, res, next) => {
  try {
    const bookingId = req.body.bookingId;

    // Find the booking by ID
    const booking = await Bookings.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { cancelOrder, bookingDate, vendorId, userId } = booking;

    const bookingTime = new Date(bookingDate).getTime();
    const currentTime = Date.now();

    if (cancelOrder) {
      return res.status(301).json({
        message:
          "You can't mark this Order as completed. This is already canceled",
      });
    }

    if (currentTime <= bookingTime) {
      return res.status(301).json({
        message: `You can't mark this Order as completed before ${bookingDate}`,
      });
    }

    // Update the booking to mark it as completed
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { orderCompleted: true },
      { new: true }
    );

    // Find the vendor by ID and update the booking status
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { "bookings.$[elem].orderCompleted": true } },
      { arrayFilters: [{ "elem.bookingId": bookingId }], new: true }
    );

    return res
      .status(200)
      .json({ message: "Marked as completed successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_ratingV = async (req, res, next) => {
  try {
    const { bookingId, rating } = req.body;

    const booking = await Bookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { ratingPermission, vendorId, bookingDate } = booking;
    const currentTime = Date.now();
    const bookingTime = new Date(bookingDate).getTime();
    const timeDifference = Math.floor(
      (currentTime - bookingTime) / (1000 * 60 * 60)
    );

    if (
      !(currentTime > bookingTime && timeDifference > 16) &&
      !ratingPermission
    ) {
      return res
        .status(301)
        .json({ message: `You can't rate before 5pm of ${bookingDate}` });
    }

    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { rating },
      { new: true }
    );

    const vendor = await Vendor.findById(vendorId);
    const index = vendor.bookings.findIndex(
      (data) => data.bookingId == bookingId
    );
    vendor.bookings[index].rating = rating;

    const validRatings = vendor.bookings.filter((data) => data.rating > 0);
    const ratingCount = validRatings.length;
    const totalRating = validRatings.reduce(
      (acc, curr) => acc + curr.rating,
      0
    );
    const averageRating = ratingCount
      ? Math.round((totalRating / ratingCount) * 100) / 100
      : 0;

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $set: {
          "bookings.$[elem].rating": rating,
          rating: averageRating,
          ratingCount: ratingCount,
        },
      },
      {
        new: true,
        arrayFilters: [{ "elem.bookingId": bookingId }],
      }
    );

    return res.status(200).json({ message: "Thanks for Rating Me..." });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_ratingU = async (req, res, next) => {
  try {
    const { bookingId, rating } = req.body;

    const booking = await Bookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { ratingPermission, vendorId, bookingDate } = booking;
    const currentTime = Date.now();
    const bookingTime = new Date(bookingDate).getTime();
    const timeDifference = Math.floor(
      (currentTime - bookingTime) / (1000 * 60 * 60)
    );

    if (
      !(currentTime > bookingTime && timeDifference > 16) &&
      !ratingPermission
    ) {
      return res
        .status(301)
        .json({ message: `You can't rate before 5pm of ${bookingDate}` });
    }

    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { rating },
      { new: true }
    );

    const vendor = await Vendor.findById(vendorId);
    const index = vendor.bookings.findIndex(
      (data) => data.bookingId == bookingId
    );
    vendor.bookings[index].rating = rating;

    const validRatings = vendor.bookings.filter((data) => data.rating > 0);
    const ratingCount = validRatings.length;
    const totalRating = validRatings.reduce(
      (acc, curr) => acc + curr.rating,
      0
    );
    const averageRating = ratingCount
      ? Math.round((totalRating / ratingCount) * 100) / 100
      : 0;

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $set: {
          "bookings.$[elem].rating": rating,
          rating: averageRating,
          ratingCount: ratingCount,
        },
      },
      {
        new: true,
        arrayFilters: [{ "elem.bookingId": bookingId }],
      }
    );

    return res.status(200).json({ message: "Thanks for Rating Me..." });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_ratingPermission = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Bookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const { bookingDate } = booking;
    const currentTime = Date.now();
    const bookingTime = new Date(bookingDate).getTime();

    if (currentTime <= bookingTime) {
      return res.status(300).json({
        message: `You can't grant rating permission before ${bookingDate}`,
      });
    }

    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { ratingPermission: true },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(500).json({ message: "Failed to update booking" });
    }

    return res
      .status(200)
      .json({ message: "Rating Permission granted", isPermissonGranted: true });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
