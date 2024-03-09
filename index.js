const express = require("express");
const mongoose = require("mongoose");
const userRoute = require("./routes/user");
const vendorRoute = require("./routes/vendor");
const employeeRoute = require("./routes/employee");
const bookingsRoute = require("./routes/bookings");
const shareRoute = require("./routes/share");
const path = require("path");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URL_1;
const pathLoc = `${process.env.FT_PATH}` || "../Aapkakaam";
const PORT = process.env.PORT;

const app = express();

app.use(express.json());
app.use(express.static(path.join(pathLoc, "dist")));

app.get("/", function (req, res) {
  res.sendFile(path.join(pathLoc, "dist", "index.html"));
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  next();
});

app.use("/user", userRoute);
app.use("/vendor", vendorRoute);
app.use("/employee", employeeRoute);

app.use("/share", shareRoute);
app.use("/bookings", bookingsRoute);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

app.use("/category", (req, res) => {
  res.sendFile(path.join(pathLoc, "dist", "index.html"));
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
