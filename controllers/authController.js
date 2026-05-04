/** @format */
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { generateOTP } = require("../utils/otpUtils");
const { sendNotification } = require("./notificationController");
const {
  sendOtpEmail,
  sendOtpWhatsApp,
  sendOtpPush,
  sendTransactionEmail,
  sendVerificationEmail,
} = require("../utils/sendotp");

// REGISTER
exports.register = async (req, res) => {
  console.log(req.body);
  try {
    const {
      fullname,
      email,
      password,
      phone,
      avatar = `https://res.cloudinary.com/dhyjebn3i/image/upload/q_auto/f_auto/v1774959207/Avatar_ql2szp.png`,
    } = req.body || {};

    if (!fullname || !email || !password || !phone) {
      return res.status(400).json({
        message: "fullname, email, password and phone number are required",
      });
    }

    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, phone, avatar) VALUES (?, ?, ?, ?, ?)",
      [fullname, email, hashedPassword, phone, avatar],
    );

    const userId = result.insertId;

    // Auto generate account
    const account_number = Math.floor(
      10000000 + Math.random() * 90000000,
    ).toString();
    const part = () => Math.floor(10 + Math.random() * 90);
    const sort_code = `${part()}-${part()}-${part()}`;

    const [accountResult] = await db.query(
      `INSERT INTO accounts (user_id, account_number, sort_code, balance, account_type)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, account_number, sort_code, 0.0, "standard"],
    );

    const accountId = accountResult.insertId;

    // Auto create vault
    const lockUntil = new Date();
    lockUntil.setFullYear(lockUntil.getFullYear() + 1);

    await db.query(
      "INSERT INTO vaults (user_id, account_id, name, balance, lock_until) VALUES (?, ?, ?, ?, ?)",
      [userId, accountId, "My Vault", 0.0, lockUntil],
    );

    // Send verification email
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      "UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?",
      [verifyToken, verifyExpires, userId],
    );

    await sendVerificationEmail(email, verifyToken);

    // Send welcome notification
    await sendNotification(
      userId,
      "Welcome to PayPiggy! 🐷",
      "Your account has been created successfully. Please verify your email to start banking.",
      "general",
    );

    res.status(201).json({
      message: "User created. Please check your email to verify your account.",
      userId,
      account: {
        account_number,
        sort_code,
        balance: 0.0,
        account_type: "standard",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// LOGIN
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

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in. Check your inbox.",
        email_not_verified: true,
      });
    }

    // Check if user is suspended
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      const remaining = Math.ceil(
        (new Date(user.suspended_until) - new Date()) / 1000 / 60,
      );
      return res.status(403).json({
        message: `Account suspended. Try again in ${remaining} minute(s).`,
        suspended: true,
        suspended_until: user.suspended_until,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = user.login_attempts + 1;

      if (attempts >= 10) {
        const suspendedUntil = new Date(Date.now() + 5 * 60 * 1000);

        await db.query(
          "UPDATE users SET login_attempts = ?, suspended_until = ? WHERE id = ?",
          [attempts, suspendedUntil, user.id],
        );

        await sendTransactionEmail(
          user.email,
          `Your PayPiggy account has been suspended for 5 minutes due to too many failed login attempts. If this was not you, please reset your password immediately.`,
        );

        await sendNotification(
          user.id,
          "Account Suspended",
          "Your account has been suspended for 5 minutes due to too many failed login attempts.",
          "security",
        );

        return res.status(403).json({
          message: "Too many failed attempts. Account suspended for 5 minutes.",
          suspended: true,
          suspended_until: suspendedUntil,
        });
      }

      await db.query("UPDATE users SET login_attempts = ? WHERE id = ?", [
        attempts,
        user.id,
      ]);

      return res.status(401).json({
        message: "Invalid credentials",
        attempts_remaining: 10 - attempts,
      });
    }

    // Successful login — reset attempts
    await db.query(
      "UPDATE users SET login_attempts = 0, suspended_until = NULL WHERE id = ?",
      [user.id],
    );

    await sendNotification(
      user.id,
      "New Login Detected",
      "A new login was detected on your PayPiggy account. If this wasn't you, please change your password immediately.",
      "security",
    );

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

  try {
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "INSERT INTO otps (user_id, otp, channel, expires_at) VALUES (?, ?, ?, ?)",
      [userId, otp, channel, expiresAt],
    );

    if (channel === "email") {
      await sendOtpEmail(user.email, otp);
    } else if (channel === "sms") {
      const phoneNumber = phone || user.phone;
      if (!phoneNumber) {
        return res.status(400).json({ message: "No phone number found" });
      }
      await sendOtpWhatsApp(phoneNumber, otp);
    } else if (channel === "push") {
      if (!fcmToken) {
        return res.status(400).json({ message: "FCM token required for push" });
      }
      await sendOtpPush(fcmToken, otp);
    } else {
      return res.status(400).json({ message: "Invalid channel" });
    }

    res.json({ message: `OTP sent via ${channel}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY OTP
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

    await db.query("UPDATE otps SET verified = TRUE WHERE id = ?", [
      rows[0].id,
    ]);

    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    const user = users[0];

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

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  const { email, channel } = req.body;

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.json({
        message: "If that email exists, an OTP has been sent",
      });
    }

    const user = users[0];
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "INSERT INTO otps (user_id, otp, channel, expires_at) VALUES (?, ?, ?, ?)",
      [user.id, otp, channel || "email", expiresAt],
    );

    if (channel === "sms") {
      await sendOtpWhatsApp(user.phone, otp);
    } else if (channel === "push") {
      await sendOtpPush(user.fcm_token, otp);
    } else {
      await sendOtpEmail(user.email, otp);
    }

    await sendNotification(
      user.id,
      "Password Reset Requested",
      "A password reset was requested for your PayPiggy account. If this wasn't you, please contact support.",
      "security",
    );

    res.json({
      message: "OTP sent",
      userId: user.id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY OTP FOR PASSWORD RESET
exports.verifyForgotOtp = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT * FROM otps 
       WHERE user_id = ? AND otp = ? AND verified = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, String(otp)],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await db.query("UPDATE otps SET verified = TRUE WHERE id = ?", [
      rows[0].id,
    ]);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [resetToken, expiresAt, userId],
    );

    res.json({ message: "OTP verified", resetToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { resetToken, password } = req.body;

  if (!resetToken || !password) {
    return res.status(400).json({ message: "Token and password are required" });
  }

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [resetToken],
    );

    if (users.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, user.id],
    );

    await sendNotification(
      user.id,
      "Password Changed",
      "Your PayPiggy password has been changed successfully. If this wasn't you, contact support immediately.",
      "security",
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY EMAIL
exports.verifyEmail = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE email_verify_token = ? AND email_verify_expires > NOW()",
      [token],
    );

    if (users.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification link" });
    }

    await db.query(
      "UPDATE users SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?",
      [users[0].id],
    );

    await sendNotification(
      users[0].id,
      "Email Verified",
      "Your email has been verified successfully. You can now log in to PayPiggy.",
      "general",
    );

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RESEND VERIFICATION EMAIL
exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND email_verified = FALSE",
      [email],
    );

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found or already verified" });
    }

    const user = users[0];
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      "UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?",
      [verifyToken, verifyExpires, user.id],
    );

    await sendVerificationEmail(user.email, verifyToken);

    res.json({
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
