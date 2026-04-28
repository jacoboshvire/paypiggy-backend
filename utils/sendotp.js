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

const formatPhone = (phone) => {
  phone = phone.replace(/[\s-]/g, "");
  if (phone.startsWith("0")) {
    return "+44" + phone.substring(1);
  }
  return phone;
};

// EMAIL via Mailjet
const sendOtpEmail = async (email, otp) => {
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_FROM_EMAIL, Name: "PayPiggy" },
        To: [{ Email: email }],
        Subject: "Your OTP Code",
        TextPart: `Your PayPiggy OTP code is: ${otp}. It expires in 10 minutes.`,
      },
    ],
  });
};

// WhatsApp OTP via Twilio
const sendOtpWhatsApp = async (phone, otp) => {
  const formattedPhone = formatPhone(phone);
  console.log("Sending WhatsApp to:", formattedPhone);

  await twilioClient.messages.create({
    body: `Your PayPiggy OTP code is: ${otp}. It expires in 10 minutes.`,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${formattedPhone}`,
  });
};

// Push Notification via Firebase
const sendOtpPush = async (fcmToken, otp) => {
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: "Your OTP Code",
      body: `Your PayPiggy OTP code is: ${otp}. It expires in 10 minutes.`,
    },
    data: { otp: String(otp) },
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

// Transaction WhatsApp
const sendTransactionWhatsApp = async (phone, message) => {
  const formattedPhone = formatPhone(phone);
  await twilioClient.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${formattedPhone}`,
  });
};

module.exports = {
  sendOtpEmail,
  sendOtpWhatsApp,
  sendOtpSms: sendOtpWhatsApp, // backward compat alias
  sendOtpPush,
  sendTransactionEmail,
  sendTransactionWhatsApp,
  sendTransactionSms: sendTransactionWhatsApp, // backward compat alias
};
