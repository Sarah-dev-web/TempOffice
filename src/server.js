const express = require("express");
const bodyParser = require("body-parser");
// import * as core from "express-serve-static-core";
// import slugify from "slug";
const nunjucks = require("nunjucks");
const OAuth2Client = require("@fwl/oauth2");
const mongoSession = require("connect-mongo");
const session = require("express-session");
const MongoClient = require("mongodb");


const clientWantsJson = (request) =>
  request.get("accept") === "application/json";

const jsonParser = bodyParser.json();
const formParser = bodyParser.urlencoded({ extended: true });

function makeApp(mongoClient) {
  const db = mongoClient.db();
  const app = express();
  const jsonParser = bodyParser.json();

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(bodyParser.json())

  app.set("view engine", "njk");

  const MongoStore = mongoSession(session);
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  const sessionParser = session({
    secret: `${process.env.SESSIONSECRET}`,
    name: "tempoffice",
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({
      client: mongoClient,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 3600000),
    },
  });

  const oauthClientConstructor = {
    openIDConfigurationURL:
      "https://fewlines.connect.prod.fewlines.tech/.well-known/openid-configuration",
    clientID: `${process.env.CLIENT_ID}`,
    clientSecret: `${process.env.CLIENT_SECRET}`,
    redirectURI: "http://localhost:8080/auth/callback",
    audience: `${process.env.AUDIENCE}`,
    scopes: ["openid", "email"],
  };

  const oauthClient = new OAuth2Client.default(oauthClientConstructor);

  app.get("/", sessionParser, async (req, res) => {
    if (!req.session || !req.session.accessToken) {
      res.render("pages/home", { isLoggedIn: false });
      console.log("you are not conected");
      return;
    }
    try {
      await oauthClient.verifyJWT(
        req.session.accessToken,
        process.env.JWT_ALGORITHM || ""
      );
      console.log("you are conected");
      res.render("pages/home", { isLoggedIn: true });
    } catch (error) {
      req.session.destroy(() => {
        res.render("pages/home", { isLoggedIn: false });
        console.error(error);
      });
    }
  });

  app.get("/locations", async (req, res) => {
    const annonces = await db.collection("Annonces").find().toArray();
    // res.json(annonce);
      // res.render("pages/location");
      res.render("pages/location", {annonces});
  });

  app.get("/locations/:location_id", async (req, res) => {
    res.render("pages/locationid");
  });
  app.post("/locations/:location_id", async (req, res) => {
    res.send("la location 1 POST");
  });

  //  annonce qui se retrouve sur la page la location (
  app.get("/api/creation_annonce", async (req, res) => {
    // const result = " veuillez vous logger";
    // await db.collection("").findOne;
    // console.log(result);
    res.render("pages/FormCreatAnn");
  });

  //  création de l'annonce par le vendeur (
  // app.post("/api/creation_annonce", async (req, res) => { });

  app.get("/api/login", async (req, res) => {
    const authURL = await oauthClient.getAuthorizationURL("state");

    const authURLinString = authURL.toString();
    res.redirect(authURLinString);
  });

  app.get("/profil", async (req, res) => {
    const users = await db.collection("Users").find().toArray();
    // res.json(annonce);
      // res.render("pages/location");
      res.render("pages/profil", {users});
  });

  app.get("/api/logout", sessionParser, async (req, res) => {
    if (req.session) {
      req.session.destroy(() => {
        res.render("pages/home", { isLoggedIn: false });
      });
    }
  });

  app.get("/auth/callback", sessionParser, async (req, res) => {
    const stringiAuthCode = `${req.query.code}`;
    const token = await oauthClient.getTokensFromAuthorizationCode(
      stringiAuthCode
    );
    console.log(token);
    if (req.session) {
      req.session.accessToken = token.access_token;
    } else {
      console.log("warning, couldn't put the tokens in session");
    }
    res.redirect("/");
  });


  app.post("/api/creation_annonce", async (req, res) => {
    const dataForm = req.body;
    const annonce = {
      titre: dataForm.titre,
      prix: dataForm.prix,
      taille: dataForm.taille,
      datedebut: dataForm.datedebut,
      datefin: dataForm.datefin,
      adresse: dataForm.adresse,
      codepostal: dataForm.codepostal,
      ville: dataForm.ville,
      mobilier: dataForm.mobilier,
      description: dataForm.description,
    };
    const result = await db.collection("Annonces").insertOne(annonce);
    const createdId = result.insertedId;

//     var cookieSession = require('cookie-session');
//     app.use(cookieSession({
//     keys: ['secret1', 'secret2']
// }));

    console.log(createdId)




    res.end('');
  });
// POUR L'INSTANT IL REDIRIGE VERS HOME 
// PAS CERTAIN QUE LES PHOTOS FONCTIONNENT // je te confirme les photos ne sont pas reprises

  //

  app.get("/api/login", async (req, res) => {
    res.send("result");
  });

  app.post("/api/login", async (req, res) => {
    res.send("result");
  });

  // This should be the last call to `app` in this file
  app.use("/static", express.static("public"));
  app.use((error, req, res) => {
    // console.error(error);
  });

  return app;
}

module.exports = { makeApp };
