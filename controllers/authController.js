/** @format */
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../utils/otpUtils");
const { sendOtpEmail, sendOtpSms, sendOtpPush } = require("../utils/sendotp");

exports.register = async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
      [fullname, email, hashedPassword],
    );

    res.status(201).json({ message: "User created", userId: result.insertId });
  } catch (err) {
    res.status(500).json(err);
  }
};

// LOGIN - returns OTP prompt instead of token directly
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful. Please verify with OTP.",
      userId: user.id,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

// SEND OTP
exports.sendOtp = async (req, res) => {
  const { userId, channel, phone, fcmToken } = req.body;
  // channel: 'email' | 'sms' | 'push'

  try {
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to DB
    await db.query(
      "INSERT INTO otps (user_id, otp, channel, expires_at) VALUES (?, ?, ?, ?)",
      [userId, otp, channel, expiresAt],
    );

    // Send via chosen channel
    if (channel === "email") {
      await sendOtpEmail(user.email, otp);
    } else if (channel === "sms") {
      if (!phone)
        return res
          .status(400)
          .json({ message: "Phone number required for SMS" });
      await sendOtpSms(phone, otp);
    } else if (channel === "push") {
      if (!fcmToken)
        return res.status(400).json({ message: "FCM token required for push" });
      await sendOtpPush(fcmToken, otp);
    } else {
      return res.status(400).json({ message: "Invalid channel" });
    }

    res.json({ message: `OTP sent via ${channel}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY OTP - issues JWT on success
exports.verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT * FROM otps 
       WHERE user_id = ? AND otp = ? AND verified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otp],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark OTP as verified
    await db.query("UPDATE otps SET verified = TRUE WHERE id = ?", [
      rows[0].id,
    ]);

    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    const user = users[0];

    // Issue JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({ message: "OTP verified", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
