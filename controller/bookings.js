const Bookings = require("../models/bookings");
const Vendor = require("../models/vendor");
const User = require("../models/user");
const { ObjectId } = require("mongodb");
const { sendNotification } = require("./singalMessaging");
const { default: axios } = require("axios");

exports.bookings_controller_postU = async (req, res, next) => {
  try {
    const { userId, vendorId, bookingDate, type, pincode, name } = req.body;

    if (!userId || !vendorId || !bookingDate || !type || !pincode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const formattedBookingDate = new Date(bookingDate).toDateString();
    const bookedOn = new Date();
    const bookingTime = Date.now();

    const vendor = await Vendor.findById(vendorId).select(
      "balance commission phoneNo"
    );
    const user = await User.findById(userId).select("bonusAmount");

    if (!user || !vendor) {
      return res.status(404).json({ message: "User or vendor not found" });
    }

    if (user.bonusAmount < 30 || vendor.balance < vendor.commission) {
      return res
        .status(402)
        .json({ message: "Insufficient balance for booking" });
    }

    const booking = new Bookings({
      userId,
      vendorId,
      bookingDate: formattedBookingDate,
      type,
      pincode,
      bookedOn,
      bookingTime,
      cancelOrder: false,
      orderCompleted: false,
      rating: 0,
      ratingPermission: false,
    });

    const result = await booking.save();

    // Update user and vendor stats
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { bonusAmount: -30, bookingCount: 1, pending: 1 },
      },
      { new: true }
    );

    const discountData = await Vendor.findById(vendorId).select(
      "totalDiscount transactionCount"
    );

    const averageDiscount =
      (discountData.totalDiscount / discountData.transactionCount === 0
        ? 1
        : discountData.transactionCount) * 0.01;

    await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $inc: {
          balance: -vendor.commission * averageDiscount,
          pendingVendor: 1,
          bookingCountVendor: 1,
        },
      },
      { new: true }
    );

    const booking1 = await Bookings.findById(result._id)
      .populate("userId", "_id cd shareBy")
      .populate("vendorId", "_id cd shareBy commission");

    // Handle referral updates
    await handleReferralUpdates(booking1.userId._id, "user", "pending");
    await handleReferralUpdates(booking1.vendorId._id, "vendor", "pending");

    // Send notifications
    // try {
    //   await axios.get(
    //     `${
    //       process.env.FAST2SMSBOOKING
    //     }variables_values=${name.toUpperCase()}%7C${formattedBookingDate}%7C&flash=1&numbers=${
    //       vendor.phoneNo
    //     }&schedule_time=`
    //   );

    //   sendNotification(
    //     vendor.fcmToken,
    //     `...You are Booked...`,
    //     `Booking Done by ${name.toUpperCase()} on ${formattedBookingDate}`,
    //     "booking"
    //   );
    // } catch (err) {
    //   console.error("Notification failed", err);
    // }

    res.status(201).json({
      message: "Booking created successfully",

      bonusAmount: updatedUser.bonusAmount,
    });
  } catch (err) {
    console.error("PostU booking error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_postV = async (req, res, next) => {
  try {
    const {
      userId,
      vendorId,
      bookingDate,
      type,
      pincode,
      isSelfBooking,
      name,
      phoneNo,
      vill,
      post,
      dist,
    } = req.body;

    if (!userId || !vendorId || !bookingDate || !type || !pincode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const formattedBookingDate = new Date(bookingDate).toDateString();
    const bookedOn = new Date();
    const bookingTime = Date.now();

    // Handle self-booking case
    if (isSelfBooking && userId === vendorId) {
      const booking = new Bookings({
        userId,
        vendorId,
        bookingDate: formattedBookingDate,
        type,
        pincode,
        bookedOn,
        bookingTime,
        cancelOrder: false,
        orderCompleted: false,
        rating: 0,
        ratingPermission: false,
        name,
        pincode,
        phoneNo,
        vill,
        post,
        dist,
      });

      const result = await booking.save();

      await Vendor.findByIdAndUpdate(
        vendorId,
        {
          $inc: { bookingCount: 1 },
        },
        { new: true }
      );

      return res.status(201).json({
        message: "Self-booking created successfully",
        bookingId: result._id,
      });
    }

    const vendor = await Vendor.findById(vendorId).select(
      "balance commission phoneNo"
    );
    const vendorUser = await Vendor.findById(userId).select("bonusAmount");

    if (!vendorUser || !vendor) {
      return res
        .status(404)
        .json({ message: "Vendor or vendor user not found" });
    }

    if (vendorUser.bonusAmount < 30 || vendor.balance < vendor.commission) {
      return res
        .status(402)
        .json({ message: "Insufficient balance for booking" });
    }

    const booking = new Bookings({
      userId,
      vendorId,
      bookingDate: formattedBookingDate,
      type,
      pincode,
      bookedOn,
      bookingTime,
      cancelOrder: false,
      orderCompleted: false,
      rating: 0,
      ratingPermission: false,
    });

    const result = await booking.save();

    // Update balances and stats
    const updatedVendorUser = await Vendor.findByIdAndUpdate(
      userId,
      { $inc: { bonusAmount: -30, bookingCount: 1, pending: 1 } },
      { new: true }
    );

    const discountData = await Vendor.findById(vendorId).select(
      "totalDiscount transactionCount"
    );

    const averageDiscount =
      (discountData.totalDiscount / discountData.transactionCount === 0
        ? 1
        : discountData.transactionCount) * 0.01;

    await Vendor.findByIdAndUpdate(
      vendorId,
      {
        $inc: {
          balance: -vendor.commission * averageDiscount,
          pendingVendor: 1,
          bookingCountVendor: 1,
        },
      },
      { new: true }
    );
    const booking1 = await Bookings.findById(result._id)
      .populate({ path: "userId", model: "Vendor", select: "_id cd shareBy" })
      .populate({ path: "vendorId", select: "_id cd shareBy commission" });

    // Handle referral updates
    console.log(booking1);
    await handleReferralUpdates(booking1.userId._id, "vendor", "pending");
    await handleReferralUpdates(booking1.vendorId._id, "vendor", "pending");

    // Send notifications
    if (userId != vendorId)
      // try {
      //   await axios.get(
      //     `${
      //       process.env.FAST2SMSBOOKING
      //     }variables_values=${name.toUpperCase()}%7C${formattedBookingDate}%7C&flash=1&numbers=${
      //       vendor.phoneNo
      //     }&schedule_time=`
      //   );

      //   sendNotification(
      //     vendor.fcmToken,
      //     `...You are Booked...`,
      //     `Booking Done by ${name.toUpperCase()} on ${formattedBookingDate}`,
      //     "booking"
      //   );
      // } catch (err) {
      //   console.error("Notification failed", err);
      // }

      res.status(201).json({
        message: "Booking created successfully",

        bonusAmount: updatedVendorUser.bonusAmount,
      });
  } catch (err) {
    console.error("PostV booking error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_get = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.params.pageNo) || 1;
    const pageSize = 12;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const skip = (page - 1) * pageSize;

    const [bookings, totalCount] = await Promise.all([
      Bookings.find({ userId: new ObjectId(userId) })
        .populate("vendorId", "name phoneNo type")
        .sort({ bookedOn: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Bookings.countDocuments({ userId: new ObjectId(userId) }),
    ]);

    const currentTime = Date.now();
    const formattedBookings = bookings.map((booking) => {
      const isPastBooking =
        new Date(booking.bookingDate).getTime() < currentTime;
      const showFullPhone =
        isPastBooking && !booking.cancelOrder && booking.rating === 0;

      let phoneNo = booking.vendorId?.phoneNo?.toString() || "";
      if (!showFullPhone && phoneNo) {
        phoneNo = phoneNo.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
      }

      return {
        bookingId: booking._id,
        name: booking.vendorId?.name || "Unknown",
        phoneNo: phoneNo,
        type: booking.type,
        date: booking.bookingDate,
        cancelOrder: booking.cancelOrder,
        orderCompleted: booking.orderCompleted,
        rating: booking.rating,
      };
    });

    res.json({
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      orders: formattedBookings,
    });
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Helper function for referral updates

async function handleReferralUpdates(
  entityId,
  entityType,
  action,
  commission = 0,
  averageDiscount = 0
) {
  try {
    let entity;
    if (entityType === "user") {
      entity = await User.findById(entityId).select("cd shareBy");
    } else {
      entity = await Vendor.findById(entityId).select("cd shareBy");
    }

    if (!entity || !entity.shareBy) return;

    let referrerModel;
    switch (entity.cd) {
      case "user":
        referrerModel = User;
        break;
      case "vendor":
        referrerModel = Vendor;
        break;
      default:
        return;
    }
    console.log(averageDiscount);

    const updateData = {};
    if (action === "cancel") {
      updateData.$inc = { pendingShareBy: -1, canceledShareBy: 1 };
    } else if (action === "complete") {
      const completedOrder =
        entityType === "vendor"
          ? await referrerModel.findById(entityId).completedVendor
          : await referrerModel.findById(entityId).completed;
      if (completedOrder > 5)
        updateData.$inc = {
          pendingShareBy: -1,
          completedShareBy: 1,
          earning: commission * 0.05 * averageDiscount,
        };
      else updateData.$inc = { pendingShareBy: -1, completedShareBy: 1 };
    } else if (action === "pending") {
      updateData.$inc = { pendingShareBy: 1 };
    }

    await referrerModel.findByIdAndUpdate(entity.shareBy, updateData);
  } catch (error) {
    console.error("Referral update error:", error);
  }
}

// Helper function for notifications
async function sendBookingNotification(
  vendorId,
  userName,
  bookingDate,
  bookingId,
  action
) {
  try {
    const vendor = await Vendor.findById(vendorId).select("fcmToken");
    if (!vendor?.fcmToken) return;

    const [date, month, year] = bookingDate.split("/");
    const message =
      action === "cancel"
        ? `Cancelled by ${userName.toUpperCase()} for { ${date}/${month}/${year} }`
        : `Booking Done by ${userName.toUpperCase()} on { ${date}/${month}/${year} }`;

    const title =
      action === "cancel"
        ? "...You have been Cancelled..."
        : "...You are Booked...";

    sendNotification(
      vendor.fcmToken,
      title,
      bookingId,
      message,
      action,
      month,
      year
    );
  } catch (error) {
    console.error("Notification error:", error);
  }
}

exports.bookings_controller_cancelU = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Bookings.findById(bookingId)
      .populate("userId", "name phoneNo cd shareBy")
      .populate("vendorId", "name phoneNo cd shareBy commission fcmToken");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.orderCompleted) {
      return res.status(400).json({
        message: "You can't cancel this order. This is already completed",
      });
    }

    if (booking.cancelOrder) {
      return res.status(400).json({
        message: "This booking is already cancelled",
      });
    }

    const cancelTime = Date.now();
    const bookingDate = new Date(booking.bookingDate);
    const formattedDate = `${bookingDate.getDate()}/${
      bookingDate.getMonth() + 1
    }/${bookingDate.getFullYear()}`;

    // Update booking status
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { cancelOrder: true, cancelTime },
      { new: true }
    );

    // Update user balance

    const updatedUser = await User.findByIdAndUpdate(
      booking.userId._id,
      { $inc: { bonusAmount: 25, pending: -1, canceled: 1 } },
      { new: true }
    );

    // Update vendor balance
    await Vendor.findByIdAndUpdate(
      booking.vendorId._id,
      {
        $inc: { pendingVendor: -1, canceledVendor: 1 },
      },
      { new: true }
    );

    // Handle referral updates
    await handleReferralUpdates(booking.userId._id, "user", "cancel");
    await handleReferralUpdates(booking.vendorId._id, "vendor", "cancel");

    // Send notifications
    // try {
    //   await axios.get(
    //     `${
    //       process.env.FAST2SMSCANCEL
    //     }variables_values=${booking.userId.name.toUpperCase()}%7C${formattedDate}%7C&flash=0&numbers=${
    //       booking.vendorId.phoneNo
    //     }&schedule_time=`
    //   );

    //   await sendBookingNotification(
    //     booking.vendorId._id,
    //     booking.userId.name,
    //     formattedDate,
    //     bookingId,
    //     "cancel"
    //   );
    // } catch (err) {
    //   console.error("Notification failed", err);
    // }

    res.status(200).json({
      message: "Order Cancelled successfully",
      bonusAmount: updatedUser.bonusAmount,
    });
  } catch (err) {
    console.error("CancelU error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_cancelV = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Bookings.findById(bookingId)
      .populate({ path: "userId", model: "Vendor", select: "_id cd shareBy" })
      .populate("vendorId", "_id cd shareBy commission fcmToken");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.orderCompleted) {
      return res.status(400).json({
        message: "You can't cancel this order. This is already completed",
      });
    }

    if (booking.cancelOrder) {
      return res.status(400).json({
        message: "This booking is already cancelled",
      });
    }

    const cancelTime = Date.now();
    const bookingDate = new Date(booking.bookingDate);
    const formattedDate = `${bookingDate.getDate()}/${
      bookingDate.getMonth() + 1
    }/${bookingDate.getFullYear()}`;

    // Update booking status
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { cancelOrder: true, cancelTime },
      { new: true }
    );

    // Update vendor user balance
    console.log(booking.userId._id);

    // if (booking.userId._id === booking.vendorId._id) return;
    const updatedVendorUser = await Vendor.findByIdAndUpdate(
      booking.userId._id,
      { $inc: { bonusAmount: 25, pending: -1, canceled: 1 } },
      { new: true }
    );

    // Update vendor balance
    await Vendor.findByIdAndUpdate(
      booking.vendorId._id,
      {
        $inc: { pendingVendor: -1, canceledVendor: 1 },
      },
      { new: true }
    );

    // Handle referral updates
    await handleReferralUpdates(booking.userId._id, "vendor", "cancel");
    await handleReferralUpdates(booking.vendorId._id, "vendor", "cancel");

    // Send notifications
    // try {
    //   await axios.get(
    //     `${
    //       process.env.FAST2SMSCANCEL
    //     }variables_values=${updatedVendorUser.name.toUpperCase()}%7C${formattedDate}%7C&flash=0&numbers=${
    //       booking.vendorId.phoneNo
    //     }&schedule_time=`
    //   );

    //   await sendBookingNotification(
    //     booking.vendorId._id,
    //     updatedVendorUser.name,
    //     formattedDate,
    //     bookingId,
    //     "cancel"
    //   );
    // } catch (err) {
    //   console.error("Notification failed", err);
    // }

    res.status(200).json({
      message: "Order Cancelled successfully",
      bonusAmount: updatedVendorUser.bonusAmount,
    });
  } catch (err) {
    console.error("CancelV error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_completeU = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Bookings.findById(bookingId)
      .populate("userId", "_id cd shareBy")
      .populate(
        "vendorId",
        "_id cd shareBy commission totalDiscount transactionCount"
      );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.cancelOrder) {
      return res.status(400).json({
        message:
          "You can't mark this Order as completed. This is already canceled",
      });
    }

    if (booking.orderCompleted) {
      return res.status(400).json({
        message: "This booking is already completed",
      });
    }

    const bookingTime = new Date(booking.bookingDate).getTime();
    const currentTime = Date.now();

    // if (currentTime <= bookingTime) {
    //   return res.status(400).json({
    //     message: `You can't mark this Order as completed before ${booking.bookingDate}`,
    //   });
    // }

    // Update booking status
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { orderCompleted: true },
      { new: true }
    );
    const discountData = await Vendor.findById(booking.vendorId._id).select(
      "totalDiscount transactionCount"
    );
    const averageDiscount =
      (discountData.totalDiscount / discountData.transactionCount === 0
        ? 1
        : discountData.transactionCount) * 0.01;

    // Update user stats
    await User.findByIdAndUpdate(booking.userId._id, {
      $inc: { pending: -1, completed: 1 },
    });

    // Update vendor stats and earning
    await Vendor.findByIdAndUpdate(booking.vendorId._id, {
      $inc: {
        pendingVendor: -1,
        completedVendor: 1,
      },
    });

    // Handle referral updates
    await handleReferralUpdates(
      booking.userId._id,
      "user",
      "complete",
      booking.vendorId.commission,
      averageDiscount
    );
    await handleReferralUpdates(
      booking.vendorId._id,
      "vendor",
      "complete",
      booking.vendorId.commission,
      averageDiscount
    );

    res.status(200).json({
      message: "Booking marked as completed successfully",
    });
  } catch (err) {
    console.error("CompleteU error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_completeV = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Bookings.findById(bookingId)
      .populate({ path: "userId", model: "Vendor", select: "_id cd shareBy" })
      .populate("vendorId", "_id cd shareBy commission");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.cancelOrder) {
      return res.status(400).json({
        message:
          "You can't mark this Order as completed. This is already canceled",
      });
    }

    if (booking.orderCompleted) {
      return res.status(400).json({
        message: "This booking is already completed",
      });
    }

    const bookingTime = new Date(booking.bookingDate).getTime();
    const currentTime = Date.now();

    // if (currentTime <= bookingTime) {
    //   return res.status(400).json({
    //     message: `You can't mark this Order as completed before ${booking.bookingDate}`,
    //   });
    // }

    // Update booking status
    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { orderCompleted: true },
      { new: true }
    );

    // Skip if same ID (self booking)
    if (booking.userId._id.toString() === booking.vendorId._id.toString()) {
      return res
        .status(200)
        .json({ message: "Self booking completed, no vendor update required" });
    }
    const discountData = await Vendor.findById(booking.vendorId._id).select(
      "totalDiscount transactionCount"
    );
    const averageDiscount =
      (discountData.totalDiscount / discountData.transactionCount === 0
        ? 1
        : discountData.transactionCount) * 0.01;

    // Update vendor user stats
    await Vendor.findByIdAndUpdate(booking.userId._id, {
      $inc: { pending: -1, completed: 1 },
    });

    // Update vendor stats and earning
    await Vendor.findByIdAndUpdate(booking.vendorId._id, {
      $inc: {
        pendingVendor: -1,
        completedVendor: 1,
      },
    });

    // Handle referral updates
    await handleReferralUpdates(
      booking.userId._id,
      "vendor",
      "complete",
      booking.vendorId.commission,
      averageDiscount
    );
    await handleReferralUpdates(
      booking.vendorId._id,
      "vendor",
      "complete",
      booking.vendorId.commission,
      averageDiscount
    );

    res.status(200).json({
      message: "Booking marked as completed successfully",
    });
  } catch (err) {
    console.error("CompleteV error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Common rating function for both user and vendor
async function handleRating(bookingId, rating) {
  const booking = await Bookings.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
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
    throw new Error(`You can't rate before 5pm of ${bookingDate}`);
  }

  // Update booking rating
  const updatedBooking = await Bookings.findByIdAndUpdate(
    bookingId,
    { rating },
    { new: true }
  );

  // Calculate new average rating for vendor
  const vendorBookings = await Bookings.find({
    vendorId,
    rating: { $gt: 0 },
  });

  const ratingCount = vendorBookings.length;
  const totalRating = vendorBookings.reduce(
    (acc, curr) => acc + curr.rating,
    0
  );
  const averageRating = ratingCount
    ? Math.round((totalRating / ratingCount) * 100) / 100
    : 0;

  // Update vendor rating
  const updatedVendor = await Vendor.findByIdAndUpdate(
    vendorId,
    {
      rating: averageRating,
      ratingCount: ratingCount,
    },
    { new: true }
  );

  return { message: "Thanks for your rating!" };
}

exports.bookings_controller_ratingV = async (req, res, next) => {
  try {
    const { bookingId, rating } = req.body;

    if (!bookingId || !rating) {
      return res
        .status(400)
        .json({ message: "Booking ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const result = await handleRating(bookingId, rating);
    res.status(200).json(result);
  } catch (err) {
    if (err.message.includes("can't rate")) {
      return res.status(400).json({ message: err.message });
    }
    console.error("RatingV error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_ratingU = async (req, res, next) => {
  try {
    const { bookingId, rating } = req.body;

    if (!bookingId || !rating) {
      return res
        .status(400)
        .json({ message: "Booking ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const result = await handleRating(bookingId, rating);
    res.status(200).json(result);
  } catch (err) {
    if (err.message.includes("can't rate")) {
      return res.status(400).json({ message: err.message });
    }
    console.error("RatingU error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.bookings_controller_ratingPermission = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Bookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const bookingTime = new Date(booking.bookingDate).getTime();
    const currentTime = Date.now();

    if (currentTime <= bookingTime) {
      return res.status(400).json({
        message: `You can't grant rating permission before ${booking.bookingDate}`,
      });
    }

    const updatedBooking = await Bookings.findByIdAndUpdate(
      bookingId,
      { ratingPermission: true },
      { new: true }
    );

    res.status(200).json({
      message: "Rating permission granted successfully",
      isPermissonGranted: true,
    });
  } catch (err) {
    console.error("Rating permission error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
