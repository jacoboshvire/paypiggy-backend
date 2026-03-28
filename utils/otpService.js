/** @format */

const db = require("../config/db");
const Mailjet = require("node-mailjet");
const twilio = require("twilio");
const admin = require("firebase-admin");

// Generate 5 character alphanumeric OTP
const generateOTP = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < 5; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
};

// Save OTP to DB
const saveOTP = async (userId, otp, type) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  await db.query(
    "INSERT INTO otps (user_id, otp, type, expires_at) VALUES (?, ?, ?, ?)",
    [userId, otp, type, expiresAt],
  );
};

// Send via Email (Mailjet)
const sendEmailOTP = async (email, otp) => {
  const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY,
  );

  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MAILJET_SENDER_EMAIL, Name: "YourApp" },
        To: [{ Email: email }],
        Subject: "Your OTP Code",
        TextPart: `Your OTP is: ${otp}. It expires in 10 minutes.`,
        HTMLPart: `<h3>Your OTP is: <strong>${otp}</strong></h3><p>It expires in 10 minutes.</p>`,
      },
    ],
  });
};

// Send via SMS (Twilio)
const sendSMSOTP = async (phone, otp) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  await client.messages.create({
    body: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

// Send via Firebase Push Notification
const sendPushOTP = async (fcmToken, otp) => {
  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: "Your OTP Code",
      body: `Your OTP is: ${otp}. It expires in 10 minutes.`,
    },
    data: { otp },
  });
};

// Main send OTP function
exports.sendOTP = async (userId, channel, contact) => {
  const otp = generateOTP();
  await saveOTP(userId, otp, channel);

  if (channel === "email") await sendEmailOTP(contact, otp);
  else if (channel === "sms") await sendSMSOTP(contact, otp);
  else if (channel === "push") await sendPushOTP(contact, otp);

  return otp;
};

// Verify OTP
exports.verifyOTP = async (userId, otp) => {
  const [rows] = await db.query(
    `SELECT * FROM otps 
     WHERE user_id = ? AND otp = ? AND used = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, otp],
  );

  if (rows.length === 0) return false;

  // Mark OTP as used
  await db.query("UPDATE otps SET used = 1 WHERE id = ?", [rows[0].id]);

  return true;
};
