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

const formatPhone = (phone) => {
  phone = phone.replace(/[\s-]/g, "");
  if (phone.startsWith("0")) {
    return "+44" + phone.substring(1);
  }
  return phone;
};

// SMS via Twilio
const sendOtpSms = async (phone, otp) => {
  const formattedPhone = formatPhone(phone);
  console.log("Sending SMS to:", formattedPhone);
  console.log("From:", process.env.TWILIO_PHONE_NUMBER);
  console.log("OTP:", otp);
  await twilioClient.messages.create({
    body: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formattedPhone,
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

// Transaction Email
const sendTransactionEmail = async (email, message) => {
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_FROM_EMAIL, Name: "PayPiggy" },
        To: [{ Email: email }],
        Subject: "Transaction Alert",
        TextPart: message,
      },
    ],
  });
};

// Transaction SMS
const sendTransactionSms = async (phone, message) => {
  const formattedPhone = formatPhone(phone);
  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: formattedPhone,
  });
};

module.exports = {
  sendOtpEmail,
  sendOtpSms,
  sendOtpPush,
  sendTransactionEmail,
  sendTransactionSms,
};
