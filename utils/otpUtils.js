/** @format */

const generateOTP = () => {
  return Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit numeric OTP
};

module.exports = { generateOTP };
