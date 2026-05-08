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

// Verification Email
const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}`;
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_FROM_EMAIL, Name: "PayPiggy" },
        To: [{ Email: email }],
        Subject: "Verify your PayPiggy email",
        TextPart: `Please verify your email by clicking this link: ${verifyUrl}. This link expires in 24 hours.`,
        HTMLPart: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #4F46E5; margin-bottom: 8px;">Verify your email</h1>
            <p style="color: #374151;">Thank you for signing up to PayPiggy. Please verify your email address to activate your account.</p>
            <a href="${verifyUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; margin: 24px 0;">Verify Email</a>
            <p style="color: #6B7280; font-size: 13px;">This link expires in 24 hours.</p>
            <p style="color: #6B7280; font-size: 13px;">If you did not create a PayPiggy account, please ignore this email.</p>
          </div>
        `,
      },
    ],
  });
};

module.exports = {
  sendOtpEmail,
  sendOtpWhatsApp,
  sendOtpSms: sendOtpWhatsApp,
  sendOtpPush,
  sendTransactionEmail,
  sendTransactionWhatsApp,
  sendTransactionSms: sendTransactionWhatsApp,
  sendVerificationEmail,
};
