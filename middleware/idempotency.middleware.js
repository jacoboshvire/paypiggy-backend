/** @format */

const db = require("../config/db");

const idempotencyCheck = async (req, res, next) => {
  try {
    let key = req.headers["idempotency-key"];

    // Auto-generate if not provided
    if (!key) {
      key = require("crypto").randomUUID();
      req.headers["idempotency-key"] = key;
    }

    const [existing] = await db.query(
      "SELECT * FROM idempotency_keys WHERE id = ?",
      [key],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Duplicate transaction detected",
      });
    }

    await db.query("INSERT INTO idempotency_keys (id) VALUES (?)", [key]);

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { idempotencyCheck };
