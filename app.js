/** @format */

const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

module.exports = app;
