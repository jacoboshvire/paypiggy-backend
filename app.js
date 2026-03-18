/** @format */

const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
// app.use("api/account", accountRoutes);
app.use("/api/auth", authRoutes);
app.use("api/transaction", transactionRoutes);

module.exports = app;
