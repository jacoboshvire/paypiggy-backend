/** @format */

const { Reader } = require("@maxmind/geoip2-node");
const path = require("path");

const DB_PATH = path.join(__dirname, "../geoip/GeoLite2-Country.mmdb");

// IPs that are allowed to bypass geo check (localhost, internal)
const WHITELISTED_IPS = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs — take the first (original client)
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress;
};

const ukOnlyGeoCheck = async (req, res, next) => {
  const ip = getClientIP(req);

  // Allow localhost/internal IPs (dev environment)
  if (WHITELISTED_IPS.includes(ip)) {
    console.log(`[GEO] Whitelisted IP ${ip} — skipping geo check`);
    return next();
  }

  try {
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

    // Attach country to request for use downstream if needed
    req.geoCountry = countryCode;
    next();
  } catch (err) {
    // If IP lookup fails (e.g. private IP range not in DB), block by default
    console.error(`[GEO] Lookup failed for IP ${ip}:`, err.message);
    return res.status(403).json({
      error: "Access denied",
      reason: "Unable to verify your location",
    });
  }
};

module.exports = { ukOnlyGeoCheck };
