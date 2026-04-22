/** @format */

const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./routes/authRoutes");
const vaultRoutes = require("./routes/vaultRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "https://your-frontend.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello from PayPiggy Backend!");
});

app.use("/api/vault", vaultRoutes);
app.use("/api/users", userRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/settings", settingsRoutes);

module.exports = app;
