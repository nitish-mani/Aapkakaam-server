const User = require("../models/user");

///////////////////////////////////////
///// for updating user address //////
//////////////////////////////////////

exports.user_controller_patch_address = (req, res, next) => {
  const userId = req.body.userId;
  const token = req.body.token;

  const vill = req.body.vill;
  const post = req.body.post;
  const dist = req.body.dist;
  const state = req.body.state;
  const pincode = req.body.pincode;

  let loadedUser;
  User.findByIdAndUpdate(
    userId,
    { address: { vill, post, dist, state, pincode }, pincode: pincode },
    { returnDocument: "after" }
  )
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;

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
        message: "Address Updated Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for modifing user name //////
//////////////////////////////////////

exports.user_controller_patch_name = (req, res, next) => {
  const name = req.body.name;
  const userId = req.body.userId;
  const token = req.body.token;
  let loadedUser;
  User.findByIdAndUpdate(userId, { name }, { returnDocument: "after" })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
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
        message: "Name Updated Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for modifing user phoneNo //////
//////////////////////////////////////

exports.user_controller_patch_phoneNo = (req, res, next) => {
  const phoneNo = req.body.phoneNo;
  const userId = req.body.userId;
  const token = req.body.token;
  let loadedUser;
  User.findByIdAndUpdate(userId, { phoneNo }, { returnDocument: "after" })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
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
        message: "Phone Number Updated Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
///////////////////////////////////////
///// for modifing user email //////
//////////////////////////////////////

exports.user_controller_patch_email = (req, res, next) => {
  const email = req.body.email;
  const userId = req.body.userId;
  const token = req.body.token;
  let loadedUser;
  User.findByIdAndUpdate(userId, { email }, { returnDocument: "after" })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
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
        message: "Email Updated Successfully ",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting user orders //////
//////////////////////////////////////

exports.user_controller_getOrders = (req, res, next) => {
  const userId = req.params.userId;

  let loadedUser;
  User.findOne({ _id: userId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
      res.status(200).json({ orders: loadedUser.orders });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting user share //////
//////////////////////////////////////

exports.user_controller_getShare = (req, res, next) => {
  const userId = req.params.userId;
  let loadedUser;
  User.findOne({ _id: userId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
      res.status(200).json({ share: loadedUser.share });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////
///// for getting user by user //////
//////////////////////////////////////

exports.user_controller_getUser = (req, res, next) => {
  const userId = req.params.userId;
  const token = req.get("Authorization").split(" ")[1];
  let loadedUser;
  User.findOne({ _id: userId })

    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
        error.statusCode = 404;
        throw error;
      }
      loadedUser = result;
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
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

///////////////////////////////////////////////////////////////////////
//// for getting user which are present in orderlist of vendor  //////
//////////////////////////////////////////////////////////////////////

exports.user_controller_getOne = async (req, res, next) => {
  const userId = req.params.userId;
  User.findOne({ _id: userId })
    .then((result) => {
      if (!result) {
        const error = new Error("Could not find User.");
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
