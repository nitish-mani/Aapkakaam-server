var admin = require("firebase-admin");
const serviceAccount = require("C:\\Users\\nitis\\Downloads\\aapkakaam-f35f3-firebase-adminsdk-fbsvc-925d27e700.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
