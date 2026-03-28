/** @format */

const admin = require("firebase-admin");
let serviceAccount;

// Load credentials
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production (Base64 env var)
  serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString(
      "utf8",
    ),
  );
} else {
  // Local development (JSON file, gitignored)
  serviceAccount = require("../quickpark-278e6-firebase-adminsdk-fbsvc-df2cc889af.json");
}

// Initialize Firebase ONCE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
