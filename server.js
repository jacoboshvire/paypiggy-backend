/** @format */

const express = require("express");
const userRoutes = require("./routes/userRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);
app.use("api/account", accountRoutes);
app.use("api/transaction", transactionRoutes);

app.listen(8080, () => console.log("Running on port 8080"));
