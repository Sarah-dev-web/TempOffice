const dotenv = require("dotenv");
const MongoClient = require("mongodb");
const { makeApp } = require("./src/server.js");
const express = require("express");
var bodyParser = require("body-parser");

dotenv.config();

const options = { useNewUrlParser: true, useUnifiedTopology: true };
const databaseUrl = process.env.MONGO_URI || "";

MongoClient.connect(databaseUrl, options).then((client) => {
  //const db = client.db();
  const app = makeApp(client);

  app.listen(process.env.PORT, () => {
    console.log(`Server listening on port: ${process.env.PORT}`);
  });
});
