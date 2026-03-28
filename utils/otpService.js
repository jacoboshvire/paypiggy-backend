/** @format */

const crypto = require("crypto");
const db = require("../config/db");
const Mailjet = require("node-mailjet");
const twilio = require("twilio");
const admin = require("firebase-admin");

// Generate 4 character numeric OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

const saveOTP = async (userId, otp) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await db.query(
    `INSERT INTO otps (user_id, otp, expires_at) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?`,
    [userId, otp, expiresAt, otp, expiresAt],
  );
};

// EMAIL via Mailjet
const sendOTPEmail = async (email, otp) => {
  const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY,
  );

  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_FROM_EMAIL, Name: "YourApp" },
        To: [{ Email: email }],
        Subject: "Your OTP Code",
        TextPart: `Your OTP is: ${otp}. It expires in 10 minutes.`,
      },
    ],
  });
};

// SMS via Twilio
const sendOTPSMS = async (phoneNumber, otp) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  await client.messages.create({
    body: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
};

// Push Notification via Firebase
const sendOTPPush = async (fcmToken, otp) => {
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: "Your OTP Code",
      body: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    },
    data: { otp },
  });
};

module.exports = {
  generateOTP,
  saveOTP,
  sendOTPEmail,
  sendOTPSMS,
  sendOTPPush,
};
