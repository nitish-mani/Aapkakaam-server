const express = require("express");
const mongoose = require("mongoose");
const userRoute = require("./routes/user");
const vendorRoute = require("./routes/vendor");
const employeeRoute = require("./routes/employee");
const bookingsRoute = require("./routes/bookings");
const shareRoute = require("./routes/share");
const adminRoute = require("./routes/admin");
const path = require("path");
const { all } = require("axios");
const { ALL } = require("dns");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URL_1;
const PORT = process.env.PORT;

const app = express();
//
app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const allowedOrigin = ["aapkakaam.com", "aapkakaam.in"];
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  next();
});

app.use("/admin", adminRoute);
app.use("/user", userRoute);
app.use("/vendor", vendorRoute);
app.use("/employee", employeeRoute);

app.use("/share", shareRoute);
app.use("/bookings", bookingsRoute);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

app.use("/category", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use("/", (req, res) => {
  res.sendFile(path.join(__dirname, "err.html"));
});

async function main() {
  await mongoose.connect(MONGODB_URI);
}

main()
  .then((result) =>
    app.listen(PORT, () => {
      console.log("server is up");
    })
  )
  .catch((err) => console.log(err));
