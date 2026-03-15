/** @format */

const express = require("express");
const userRoutes = require("./src/routes/userRoutes");

const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

app.listen(8080, () => console.log("Running on port 3000"));
