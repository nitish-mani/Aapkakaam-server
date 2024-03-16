const Bookings = require("../models/bookings");
const Vendor = require("../models/vendor");
const User = require("../models/user");

exports.bookings_controller_post = (req, res, next) => {
  const userId = req.body.userId;
  const vendorId = req.body.vendorId;
  const date = req.body.bookingDate;
  const type = req.body.type;
  const pincode = req.body.pincode;
  const bookedOn = new Date().toDateString();
  const bookingTime = Date.now();

  Vendor.findById(vendorId).then((result) => {
    const balance = result.balance;

    if (vendorId && balance >= 5) {
      const bookings = new Bookings({
        userId: userId,
        vendorId: vendorId,
        bookingDate: date,
        type: type,
        pincode: pincode,
        bookedOn,
        cancelOrder: false,
        orderCompleted: false,
        rating: 0,
        bookingTime,
      });

      bookings
        .save()
        .then((result) => {
          res.status(200).json({ bookingId: result._id });
        })
        .catch((err) =>
          res.status(200).json({ message: "Something Bad Happens..." })
        );
    } else {
      res
        .status(302)
        .json({ message: "You don't have enough Balance for booking" });
    }
  });
};

exports.bookings_controller_get = (req, res, next) => {
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

      const currentDate = Date.now();

      result.forEach((data) => {
        const phoneNo = data.vendorId.phoneNo.toString();
        const maskedNumber =
          phoneNo.substring(0, 2) + "*".repeat(6) + phoneNo.substring(8);

        const bookingDate = new Date(data.bookingDate);

        orders.push({
          bookingId: data._id,
          name: data.vendorId.name,
          phoneNo:
            currentDate > bookingDate && !data.cancelOrder
              ? phoneNo
              : maskedNumber,
          type: data.type,
          date: data.bookingDate,
          cancelOrder: data.cancelOrder,
          orderCompleted: data.orderCompleted,
          rating: data.rating,
        });
      });
      res.json(orders);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.bookings_controller_cancelU = (req, res, next) => {
  const bookingId = req.body.bookingId;
  const cancelTime = Date.now();

  Bookings.findById(bookingId)
    .then((result) => {
      const orderCompleted = result.orderCompleted;

      if (!orderCompleted)
        Bookings.findByIdAndUpdate(
          bookingId,
          { cancelOrder: true, cancelTime },
          { returnDocument: "after" }
        ).then((result) => {
          const vendorId = result.vendorId;
          const userId = result.userId;

          Vendor.findById(vendorId).then((result) => {
            let balance = result.balance + 5;

            const index = result.bookings.findIndex(
              (data) => data.bookingId == bookingId
            );
            const bookings = {
              ...result.bookings[index],
              cancelOrder: true,
              cancelTime,
            };

            const array = [...result.bookings];
            const resultarray = [];
            array.forEach((data, i) => {
              if (i == index) {
                resultarray.push(bookings);
              } else {
                resultarray.push(data);
              }
            });

            Vendor.findByIdAndUpdate(
              vendorId,
              {
                bookings: resultarray,
                balance,
              },
              { returnDocument: "after" }
            ).then((suc) => {
              User.findById(userId).then((result) => {
                let balance = result.balance + 5;

                User.findByIdAndUpdate(
                  userId,
                  {
                    balance,
                  },
                  { returnDocument: "after" }
                ).then((suc) => {
                  res.status(200).json({ message: "Order Canceled" });
                });
              });
            });
          });
        });
      else {
        res.status(301).json({
          message: "You can't cancel this order. This is already completed",
        });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.bookings_controller_cancelV = (req, res, next) => {
  const bookingId = req.body.bookingId;
  const cancelTime = Date.now();
  Bookings.findById(bookingId)
    .then((result) => {
      const orderCompleted = result.orderCompleted;

      if (!orderCompleted)
        Bookings.findByIdAndUpdate(
          bookingId,
          { cancelOrder: true, cancelTime },
          { returnDocument: "after" }
        ).then((result) => {
          const vendorId = result.vendorId;
          const vendorUser = result.userId;

          Vendor.findById(vendorId).then((result) => {
            let balance = result.balance + 5;
            const index = result.bookings.findIndex(
              (data) => data.bookingId == bookingId
            );
            const bookings = {
              ...result.bookings[index],
              cancelOrder: true,
              cancelTime,
            };
            const array = [...result.bookings];
            const resultarray = [];
            array.forEach((data, i) => {
              if (i == index) {
                resultarray.push(bookings);
              } else {
                resultarray.push(data);
              }
            });

            Vendor.findByIdAndUpdate(
              vendorId,
              {
                bookings: resultarray,
                balance,
              },
              { returnDocument: "after" }
            ).then((suc) => {
              Vendor.findById(vendorUser).then((result) => {
                let balance = result.balance + 5;

                Vendor.findByIdAndUpdate(
                  vendorUser,
                  {
                    balance,
                  },
                  { returnDocument: "after" }
                ).then((suc) => {
                  res.status(200).json({ message: "Order Canceled" });
                });
              });
            });
          });
        });
      else {
        res.status(301).json({
          message: "You can't cancel this order. This is already completed",
        });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.bookings_controller_completeU = (req, res, next) => {
  const bookingId = req.body.bookingId;

  Bookings.findById(bookingId).then((result) => {
    const cancelOrder = result.cancelOrder;

    const bookingTime = new Date(result.bookingDate).getTime();
    const currentTime = new Date().getTime();
    if (!cancelOrder) {
      if (currentTime > bookingTime)
        Bookings.findByIdAndUpdate(
          bookingId,
          { orderCompleted: true },
          { returnDocument: "after" }
        )
          .then((result) => {
            const vendorId = result.vendorId;
            const userId = result.userId;

            Vendor.findById(vendorId).then((result) => {
              let balance = result.balance + 5;

              const index = result.bookings.findIndex(
                (data) => data.bookingId == bookingId
              );
              const bookings = {
                ...result.bookings[index],
                orderCompleted: true,
              };

              const array = [...result.bookings];
              const resultarray = [];
              array.forEach((data, i) => {
                if (i == index) {
                  resultarray.push(bookings);
                } else {
                  resultarray.push(data);
                }
              });

              Vendor.findByIdAndUpdate(
                vendorId,
                {
                  bookings: resultarray,
                  balance,
                },
                { returnDocument: "after" }
              ).then((suc) => {
                User.findById(userId).then((result) => {
                  let balance = result.balance + 5;

                  User.findByIdAndUpdate(
                    userId,
                    {
                      balance,
                    },
                    { returnDocument: "after" }
                  ).then((suc) => {
                    res.status(200).json({ message: "Mark As Completed" });
                  });
                });
              });
            });
          })
          .catch((err) => {
            if (!err.statusCode) {
              err.statusCode = 500;
            }
            next(err);
          });
      else {
        res.status(301).json({
          message: `You can't mark this Order as completed  before ${result.bookingDate}`,
        });
      }
    } else {
      res.status(301).json({
        message: `You can't mark this Order as completed . This is already canceled`,
      });
    }
  });
};

exports.bookings_controller_completeV = (req, res, next) => {
  const bookingId = req.body.bookingId;

  Bookings.findById(bookingId).then((result) => {
    const cancelOrder = result.cancelOrder;

    const bookingTime = new Date(result.bookingDate).getTime();
    const currentTime = new Date().getTime();
    if (!cancelOrder) {
      if (currentTime > bookingTime)
        Bookings.findByIdAndUpdate(
          bookingId,
          { orderCompleted: true },
          { returnDocument: "after" }
        )
          .then((result) => {
            const vendorId = result.vendorId;
            const vendorUser = result.userId;

            Vendor.findById(vendorId).then((result) => {
              let balance = result.balance + 5;
              const index = result.bookings.findIndex(
                (data) => data.bookingId == bookingId
              );
              const bookings = {
                ...result.bookings[index],
                orderCompleted: true,
              };
              const array = [...result.bookings];
              const resultarray = [];
              array.forEach((data, i) => {
                if (i == index) {
                  resultarray.push(bookings);
                } else {
                  resultarray.push(data);
                }
              });

              Vendor.findByIdAndUpdate(
                vendorId,
                {
                  bookings: resultarray,
                  balance,
                },
                { returnDocument: "after" }
              ).then((suc) => {
                Vendor.findById(vendorUser).then((result) => {
                  let balance = result.balance + 5;

                  Vendor.findByIdAndUpdate(
                    vendorUser,
                    {
                      balance,
                    },
                    { returnDocument: "after" }
                  ).then((suc) => {
                    res.status(200).json({ message: "Mark As Completed" });
                  });
                });
              });
            });
          })
          .catch((err) => {
            if (!err.statusCode) {
              err.statusCode = 500;
            }
            next(err);
          });
      else {
        res.status(301).json({
          message: `You can't mark this Order as completed  before ${result.bookingDate}`,
        });
      }
    } else {
      res.status(301).json({
        message: `You can't mark this Order as completed . This is already canceled`,
      });
    }
  });
};

exports.bookings_controller_ratingV = (req, res, next) => {
  const bookingId = req.body.bookingId;
  const rating = req.body.rating;

  Bookings.findById(bookingId).then((result) => {
    const ratingPermission = result.ratingPermission;

    const bookingTime = new Date(result.bookingDate).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = Math.floor(
      (currentTime - bookingTime) / (1000 * 60 * 60)
    );

    if ((currentTime > bookingTime && timeDifference > 16) || ratingPermission)
      Bookings.findByIdAndUpdate(
        bookingId,
        { rating: rating },
        { returnDocument: "after" }
      )
        .then((result) => {
          const vendorId = result.vendorId;

          Vendor.findById(vendorId).then((result) => {
            const index = result.bookings.findIndex(
              (data) => data.bookingId == bookingId
            );
            const bookings = { ...result.bookings[index], rating: rating };
            const array = [...result.bookings];
            const resultarray = [];
            let ratingCount = 1;
            let totalRating = rating;

            array.forEach((data, i) => {
              if (data.rating > 0) {
                ratingCount++;
                totalRating += data.rating;
              }
              if (i == index) {
                resultarray.push(bookings);
              } else {
                resultarray.push(data);
              }
            });

            const averageRating =
              Math.round((totalRating / ratingCount) * 100) / 100;

            Vendor.findByIdAndUpdate(
              vendorId,
              {
                bookings: resultarray,
                rating: averageRating,
                ratingCount: ratingCount,
              },
              { returnDocument: "after" }
            ).then((suc) => {
              res.status(200).json({ message: "Thanks for Rating Me..." });
            });
          });
        })
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
    else {
      res.status(301).json({
        message: `You can't rate before 5pm of ${result.bookingDate}`,
      });
    }
  });
};

exports.bookings_controller_ratingU = (req, res, next) => {
  const bookingId = req.body.bookingId;
  const rating = req.body.rating;

  Bookings.findById(bookingId).then((result) => {
    const ratingPermission = result.ratingPermission;

    const bookingTime = new Date(result.bookingDate).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = Math.floor(
      (currentTime - bookingTime) / (1000 * 60 * 60)
    );
    if ((currentTime > bookingTime && timeDifference > 16) || ratingPermission)
      Bookings.findByIdAndUpdate(
        bookingId,
        { rating: rating },
        { returnDocument: "after" }
      )
        .then((result) => {
          const vendorId = result.vendorId;

          Vendor.findById(vendorId).then((result) => {
            const index = result.bookings.findIndex(
              (data) => data.bookingId == bookingId
            );
            const bookings = { ...result.bookings[index], rating: rating };
            const array = [...result.bookings];
            const resultarray = [];
            let ratingCount = 1;
            let totalRating = rating;

            array.forEach((data, i) => {
              if (data.rating > 0) {
                ratingCount++;
                totalRating += data.rating;
              }
              if (i == index) {
                resultarray.push(bookings);
              } else {
                resultarray.push(data);
              }
            });

            const averageRating =
              Math.round((totalRating / ratingCount) * 100) / 100;

            Vendor.findByIdAndUpdate(
              vendorId,
              {
                bookings: resultarray,
                rating: averageRating,
                ratingCount: ratingCount,
              },
              { returnDocument: "after" }
            ).then((suc) => {
              res.status(200).json({ message: "Thanks for Rating Me..." });
            });
          });
        })
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
    else {
      res.status(301).json({
        message: `You can't rate before 5pm of ${result.bookingDate}`,
      });
    }
  });
};

exports.bookings_controller_ratingPermission = (req, res, next) => {
  const bookingId = req.body.bookingId;
  Bookings.findById(bookingId).then((result) => {
    const bookingTime = new Date(result.bookingDate).getTime();
    const currentTime = new Date().getTime();

    if (currentTime > bookingTime)
      Bookings.findByIdAndUpdate(
        bookingId,
        { ratingPermission: true },
        { returnDocument: "after" }
      )
        .then((result) =>
          res.status(200).json({ message: "Rating Permission granted" })
        )
        .catch((err) => {
          if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
        });
    else {
      res.status(300).json({
        message: `You can't grant rating permission before ${result.bookingDate}`,
      });
    }
  });
};
