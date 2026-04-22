/** @format */

require("dotenv").config();
const app = require("./app");
const cors = require("cors");

app.use(cors());

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = app;
