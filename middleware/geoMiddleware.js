/** @format */

const { Reader } = require("@maxmind/geoip2-node");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../geoip/GeoLite2-Country.mmdb");
const WHITELISTED_IPS = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress;
};

const ukOnlyGeoCheck = async (req, res, next) => {
  const country = req.headers["x-vercel-ip-country"];

  if (country && country !== "GB") {
    return res.status(403).json({
      error: "Access denied",
      reason: "This service is only available in the United Kingdom",
      detected_country: country,
    });
  }

  const ip = getClientIP(req);
  if (WHITELISTED_IPS.includes(ip)) {
    return next();
  }

  try {
    if (!fs.existsSync(DB_PATH)) {
      return next();
    }

    const reader = await Reader.open(DB_PATH);
    const result = reader.country(ip);
    const countryCode = result.country?.isoCode;

    if (countryCode !== "US") {
      return res.status(403).json({
        error: "Access denied",
        reason: "This service is only available in the United Kingdom",
        detected_country: countryCode ?? "Unknown",
      });
    }

    req.geoCountry = countryCode;
    next();
  } catch (err) {
    return next();
  }
};

module.exports = { ukOnlyGeoCheck };
