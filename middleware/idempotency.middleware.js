/** @format */

const db = require("../config/db");

const idempotencyCheck = async (req, res, next) => {
  try {
    const key = req.headers["idempotency-key"];

    if (!key) {
      return res.status(400).json({
        message: "Missing idempotency key",
      });
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
