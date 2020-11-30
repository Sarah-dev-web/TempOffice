const express = require("express");
const bodyParser = require("body-parser");
// import * as core from "express-serve-static-core";
// import slugify from "slug";
const nunjucks = require("nunjucks");
const OAuth2Client = require("@fwl/oauth2");
const mongoSession = require("connect-mongo");
const session = require("express-session");
const MongoClient = require("mongodb");
const nodemailer = require("nodemailer")

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

  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(bodyParser.json());

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
    res.render("pages/location", { annonces });
  });

  app.get("/locations/:location_id", async (req, res) => {
    const locationId = req.params.location_id;
    const annonce = await db
      .collection("Annonces")
      .findOne({ "_id.$oid": locationId }.toArray);
    console.log(annonce);
    res.render("pages/locationid", { annonce, locationId });
  });
  // PRENDRE L'INDEX DE L'ID POUR LEUR PREPARER UN BEAU BOUTON

  app.post("/locations/:location_id", async (req, res) => {
    res.send("la location 1 POST");
  });
  //message d'information sur ajout un bureau 
  app.get("/api/sendMail", async (req, res) => {
    const transporter = nodemailer.createTransport({
      service: process.env.GMAIL_SERVICE_NAME,
      host: process.env.GMAIL_SERVICE_HOST,
      secure: process.env.GMAIL_SERVICE_SECURE,
      port: process.env.GMAIL_SERVICE_PORT,
      auth: {
        user: process.env.GMAIL_USER_NAME,
        pass: process.env.GMAIL_USER_PASSWORD,
      },
    });

    const mailOptions = {
      from: "tempoffice.contact@gmail.com",
      to: "damien.skrzypczak@gmail.com",
      subject: "Sending Email using Node.js",
      text: "That was easy!",
    };

    await transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.json(error);
      }
      res.redirect("/");
    });
  });

  // creation de l'envoi d'un mail pour à l'acheteur pour la location 
  app.get("/api/sendMailAch", async (req, res) => {


    const transporter = nodemailer.createTransport({
      service: process.env.GMAIL_SERVICE_NAME,
      host: process.env.GMAIL_SERVICE_HOST,
      secure: process.env.GMAIL_SERVICE_SECURE,
      port: process.env.GMAIL_SERVICE_PORT,
      auth: {
        user: process.env.GMAIL_USER_NAME,
        pass: process.env.GMAIL_USER_PASSWORD,
      },
    });

    const mailOptionsAttente = {
      from: "tempoffice.contact@gmail.com",
      to: "fmariama219@gmail.com",
      subject: "Sending Email using Node.js",
      text: "vous avez demander à louer ce bureau! \n veillez attendre la confirmation du vendeur "
    };

    const mailOptionsConfirmation = {
      from: "tempoffice.contact@gmail.com",
      to: "damien.skrzypczak@gmail.com",
      subject: "Sending Email using Node.js",
      text: "Veuillez confirmer la demande de location. "
    };

    const resultatAttente = await transporter.sendMail(mailOptionsAttente, function (error, info) {
      if (error) {
        return "erreur"
      } else {
        return "Mail bien envoyé"
      }
    });

    const resultatConfirmation = await transporter.sendMail(mailOptionsConfirmation, function (error, info) {
      if (error) {
        return "erreur"
      } else {
        return "Mail bien envoyé"
      }
    });

    console.log(resultatAttente, resultatConfirmation)

    if (resultatAttente === "erreur" || resultatConfirmation === "erreur") {
      res.json({ message: "Erreur dans l'un des mails", resultatAttente, resultatConfirmation })
    }

    res.redirect("/")
  })

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
    res.render("pages/profil", { users });
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

    //code qui permet de décoder le token
    const [header, payload] = token.id_token.split(".");

    const decodedHeader = OAuth2Client.decodeJWTPart(header);
    const decodedPayload = OAuth2Client.decodeJWTPart(payload);

    // récupère l'email du token
    const dataEmailUser = decodedPayload.email;
    console.log("email du token :" + dataEmailUser);

    // rechercher si  l'email est déjà enregistré dans la bd

    // récupère l'email dans la BD dont la valeur est égale à celle de l'email du token

    const dataEmailBd = await db
      .collection("Users")
      .findOne({ mail: dataEmailUser });

    console.log("email de la db", dataEmailBd);

    //# sélectionner les documents comportant un champ particulier
    // const mailDb = await db.users.find({ Mail: { $exists: true } });
    // console.log("champ mail présent dans la db", mailDb);

    let dataEmailBdUser = "";

    if (dataEmailBd !== null) {
      dataEmailBdUser = dataEmailBd.mail;
      console.log("email bd user ", dataEmailBdUser);
    }

    // si le compte existe déjà, on crée le cookie en mémorisant le mail
    if (dataEmailUser === dataEmailBdUser && req.session) {
      req.session.accessToken = token.access_token;
      req.session.mail = dataEmailUser;
    } else {
      //
      //
      const dataNewUser = decodedPayload;

      const insertdData = {
        mail: dataNewUser.email,
        annonce_vendeur: [],
        annonce_acheteur: [],
        data_fewlines: dataNewUser,
      };

      const ajoutDataNewUser = await db
        .collection("Users")
        .insertOne(insertdData);

      req.session.accessToken = token.access_token;
      req.session.mail = dataEmailUser;

      //console.log(
      // "warning, couldn't put the tokens in session, vous devez créer un compte"
      //);
    }
    res.redirect("/");
  });

  app.post("/api/creation_annonce", async (req, res) => {
    const dataForm = req.body;
    const annonce = {
      email: dataForm.email,
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
    // const createdId = result.insertedId;

    // //     var cookieSession = require('cookie-session');
    // //     app.use(cookieSession({
    // //     keys: ['secret1', 'secret2']
    // // }));

    // console.log(createdId)
    // console.log(result)
    res.redirect("/");
  });
  // POUR L'INSTANT IL REDIRIGE VERS HOME
  // PAS CERTAIN QUE LES PHOTOS FONCTIONNENT // je te confirme les photos ne sont pas reprises

  app.post("/locations", async (req, res) => {
    const dataForm = req.body;
    const annonce = {
      titre: dataForm.titre,
      description: dataForm.description,
      prix: dataForm.prix,
      taille: dataForm.taille,
      datedebut: dataForm.datedebut,
      datefin: dataForm.datefin,
      adresse: dataForm.adresse,
      ville: dataForm.ville,
      filename: dataForm.filename,
      mobilier: dataForm.mobilier,
      checked: dataForm.checked,
      description: dataForm.description,
    };
    // console.log("DATAFORM", dataForm);
    db.collection("Annonces").insertOne({ annonce });

    res.render("pages/location");
  });
  app.get("/locations");
  //


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
