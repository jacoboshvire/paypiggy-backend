/** @format */

const Mailjet = require("node-mailjet");
const twilio = require("twilio");
const admin = require("firebase-admin");

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY,
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// EMAIL via Mailjet
const sendOtpEmail = async (email, otp) => {
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_FROM_EMAIL, Name: "YourApp" },
        To: [{ Email: email }],
        Subject: "Your OTP Code",
        TextPart: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
      },
    ],
  });
};

// SMS via Twilio
const sendOtpSms = async (phone, otp) => {
  await twilioClient.messages.create({
    body: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

// Push Notification via Firebase
const sendOtpPush = async (fcmToken, otp) => {
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: "Your OTP Code",
      body: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
    },
    data: { otp },
  });
};

module.exports = { sendOtpEmail, sendOtpSms, sendOtpPush };
