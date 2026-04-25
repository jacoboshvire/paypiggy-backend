/** @format */

const { Reader } = require("@maxmind/geoip2-node");
const path = require("path");

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
  // Use Vercel's built-in geo header — gives real user location
  const vercelCountry = req.headers["x-vercel-ip-country"];

  if (vercelCountry) {
    console.log(`[GEO] Vercel detected country: ${vercelCountry}`);
    if (vercelCountry !== "GB") {
      return res.status(403).json({
        error: "Access denied",
        reason: "This service is only available in the United Kingdom",
        detected_country: vercelCountry,
      });
    }
    return next();
  }

  // Fallback for local development
  const ip = getClientIP(req);

  if (WHITELISTED_IPS.includes(ip)) {
    console.log(`[GEO] Whitelisted IP ${ip} — skipping geo check`);
    return next();
  }

  try {
    const fs = require("fs");
    if (!fs.existsSync(DB_PATH)) {
      console.log("[GEO] GeoIP database not found — skipping geo check");
      return next();
    }

    const reader = await Reader.open(DB_PATH);
    const result = reader.country(ip);
    const countryCode = result.country?.isoCode;

    console.log(`[GEO] IP: ${ip} | Country: ${countryCode}`);

    if (countryCode !== "GB") {
      return res.status(403).json({
        error: "Access denied",
        reason: "This service is only available in the United Kingdom",
        detected_country: countryCode ?? "Unknown",
      });
    }

    req.geoCountry = countryCode;
    next();
  } catch (err) {
    console.error(`[GEO] Lookup failed for IP ${ip}:`, err.message);
    return next();
  }
};

module.exports = { ukOnlyGeoCheck };
