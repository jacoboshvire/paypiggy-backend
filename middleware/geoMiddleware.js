/** @format */

const ukOnlyGeoCheck = async (req, res, next) => {
  // Use Vercel's built-in geo headers
  const country = req.headers["x-vercel-ip-country"];

  if (country && country !== "GB") {
    return res.status(403).json({
      error: "Access denied",
      reason: "This service is only available in the United Kingdom",
      detected_country: country,
    });
  }

  // Fall back to GeoIP for non-Vercel environments
  const ip = getClientIP(req);
  if (WHITELISTED_IPS.includes(ip)) {
    return next();
  }

  try {
    const fs = require("fs");
    if (!fs.existsSync(DB_PATH)) {
      return next();
    }

    const reader = await Reader.open(DB_PATH);
    const result = reader.country(ip);
    const countryCode = result.country?.isoCode;

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
    return next();
  }
};

export default ukOnlyGeoCheck;
