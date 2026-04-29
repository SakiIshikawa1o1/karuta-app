const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API起動中");
});

app.listen(3000, () => {
  console.log("サーバー起動：http://localhost:3000");
});