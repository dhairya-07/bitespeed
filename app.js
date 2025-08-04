require("dotenv").config();
const express = require("express");
const identifyRouter = require("./routes/identify");

const app = express();
app.use(express.json());

const { syncDB } = require("./models/index");
syncDB();

app.use("/identify", identifyRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
