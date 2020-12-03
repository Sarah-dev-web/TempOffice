const express = require("express");
const bodyParser = require("body-parser");
// import * as core from "express-serve-static-core";
// import slugify from "slug";
const nunjucks = require("nunjucks");
const OAuth2Client = require("@fwl/oauth2");
const mongoSession = require("connect-mongo");
const session = require("express-session");
const MongoClient = require("mongodb");
const nodemailer = require("nodemailer");
var multer = require("multer");
const http = require("http");
const path = require("path");
const fs = require("fs");

const upload = multer({
  dest: path.join(__dirname, "../public/uploads"),

  // you might also want to set some limits: https://github.com/expressjs/multer#limits
});

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

  let host = "http://localhost:8080";

  if (process.env.NODE_ENV === "production") {
    host = "https://tempoffice.herokuapp.com";
  }

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
    redirectURI: `${process.env.OAUTH_CALLBACK_URL}`,
    audience: `${process.env.AUDIENCE}`,
    scopes: ["openid", "email"],
  };

  const oauthClient = new OAuth2Client.default(oauthClientConstructor);

  app.get("/", sessionParser, async (req, res) => {
    const homeAllAnnonces = await db.collection("Annonces").find().toArray();
    // affiche bien un tableau avec toutes les annonces dans la BD
    let annonceBD;
    const selectThreeAnnonces = [
      homeAllAnnonces[homeAllAnnonces.length - 3],
      homeAllAnnonces[homeAllAnnonces.length - 2],
      homeAllAnnonces[homeAllAnnonces.length - 1],
    ];
    if (!req.session || !req.session.accessToken) {
      res.render("pages/home", { selectThreeAnnonces, isLoggedIn: false });
      return;
    }
    try {
      await oauthClient.verifyJWT(
        req.session.accessToken,
        process.env.JWT_ALGORITHM || ""
      );
      res.render("pages/home", { selectThreeAnnonces, isLoggedIn: true });
    } catch (error) {
      req.session.destroy(() => {
        res.render("pages/home", { isLoggedIn: false });
        console.error(error);
      });
    }
  });
  app.get("/locations", sessionParser, async (req, res) => {
    const annonces = await db.collection("Annonces").find().toArray();
    if (!req.session || !req.session.accessToken) {
      res.render("pages/location", { annonces, isLoggedIn: false });
      return;
    }
    try {
      await oauthClient.verifyJWT(
        req.session.accessToken,
        process.env.JWT_ALGORITHM || ""
      );
      res.render("pages/location", { annonces, isLoggedIn: true });
    } catch (error) {
      req.session.destroy(() => {
        res.render("pages/location", { annonces, isLoggedIn: false });
        console.error(error);
      });
    }
  });

  app.get("/locations/:location_id", sessionParser, async (req, res) => {
    const locationId = req.params.location_id;
    const annonce = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(locationId) });
    if (!req.session || !req.session.accessToken) {
      res.render("pages/locationid", {
        annonce,
        locationId,
        isLoggedIn: false,
      });

      return;
    }
    try {
      await oauthClient.verifyJWT(
        req.session.accessToken,
        process.env.JWT_ALGORITHM || ""
      );
      res.render("pages/locationid", { annonce, locationId, isLoggedIn: true });
    } catch (error) {
      req.session.destroy(() => {
        res.render("pages/locationid", {
          annonce,
          locationId,
          isLoggedIn: false,
        });
        console.error(error);
      });
    }
  });

  app.post("/locations/:location_id", async (req, res) => {
    res.send("la location 1 POST");
  });
  //message d'information sur ajout d'un bureau
  app.get("/api/sendMail", sessionParser, async (req, res) => {
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
      to: req.session.mail,
      subject: "Confirmation d'ajout",
      text: "vous avez ajouter une annonce!",
    };

    // req.session.mail

    await transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.json(error);
      }
      res.redirect("/");
    });
  });

  // creation de l'envoi d'un mail pour à l'acheteur pour la location
  app.get("/api/sendMailAch/:annonceid", sessionParser, async (req, res) => {
    const Idacheteur = await db
      .collection("Users")
      .updateOne(
        { mail: req.session.mail },
        { $push: { annonce_acheteur: req.params.annonceid } }
      );

    const vendeurData = await db.collection("Users").findOne({
      annonce_vendeur: { $all: [MongoClient.ObjectId(req.params.annonceid)] },
    });
    const acheteurData = await db
      .collection("Users")
      .findOne({ mail: req.session.mail });

    const adressAch = req.params.annonceid;

    const Id = await db
      .collection("Users")
      .updateOne(
        { mail: req.session.mail },
        { $push: { annonce_acheteur: req.params.annonceid } }
      );

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
      to: req.session.mail,
      subject: "Attente de confirmation",
      text:
        "vous avez demander à louer ce bureau! \n Veuillez attendre la confirmation du vendeur ",
    };

    // Retrouver le mail de celui qui a creer l'annonce
    // Lui envoyer le mail de confirmation

    const mailOptionsConfirmation = {
      from: "tempoffice.contact@gmail.com",
      to: vendeurData.mail, // a remplacer par l'adresse mail de celui qui a creer l'annonce
      subject: "Demande de Confirmation",
      html: `<div> Veuillez confirmer la demande de location. <a href ='${host}/api/confirmation?v=${vendeurData._id}&a=${acheteurData._id}'>Confirmation </a> </div>`,
    };

    const resultatAttente = await transporter.sendMail(
      mailOptionsAttente,
      function (error, info) {
        if (error) {
          return "erreur";
        } else {
          return "Mail bien envoyé";
        }
      }
    );

    const resultatConfirmation = await transporter.sendMail(
      mailOptionsConfirmation,
      function (error, info) {
        if (error) {
          return "erreur";
        } else {
          return "Mail bien envoyé";
        }
      }
    );

    if (resultatAttente === "erreur" || resultatConfirmation === "erreur") {
      res.json({
        message: "Erreur dans l'un des mails",
        resultatAttente,
        resultatConfirmation,
      });
    }

    res.redirect("/");
  });

  app.get("/api/confirmation", sessionParser, async (req, res) => {
    //Recuperer a et v , trouver le user a partir de l'id
    const userValidation = await db
      .collection("Users")
      .findOne({ _id: MongoClient.ObjectId(req.query.a) });

    //trouver l'email de l'user .mail
    //Envoi du mail de validation

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

    const mailOptionsValide = {
      from: "tempoffice.contact@gmail.com",
      to: userValidation.mail,
      subject: "Mail de confirmation du vendeur",
      text: "Votre demande de location à été bien confirmé ",
    };

    const resulValidation = await transporter.sendMail(
      mailOptionsValide,
      function (error, info) {
        if (error) {
          return "erreur";
        } else {
          return "Mail bien envoyé";
        }
      }
    );

    res.json("Merci pour votre confirmation.");
  });

  //  annonce qui se retrouve sur la page la location (
  app.get("/api/creation_annonce", sessionParser, async (req, res) => {
    const currentDate = new Date();
    const formatedDate = currentDate.toISOString().slice(0, 10);

    if (!req.session || !req.session.accessToken) {
      res.render("pages/FormCreatAnn", { isLoggedIn: false, formatedDate });

      return;
    }
    try {
      await oauthClient.verifyJWT(
        req.session.accessToken,
        process.env.JWT_ALGORITHM || ""
      );
      res.render("pages/FormCreatAnn", { isLoggedIn: true, formatedDate });
    } catch (error) {
      req.session.destroy(() => {
        res.render("pages/FormCreatAnn", { isLoggedIn: false, formatedDate });
        console.error(error);
      });
    }
  });

  app.get("/api/login", async (req, res) => {
    const authURL = await oauthClient.getAuthorizationURL("state");

    const authURLinString = authURL.toString();
    res.redirect(authURLinString);
  });


  app.get("/profil", sessionParser, async (req, res) => {
    const users = req.session.mail;
    // res.json(annonce);
    // res.render("pages/location");


    const profilUser = await db
      .collection("Users")
      .findOne({ mail: req.session.mail });

    let tabAnnonceVendeur = [];
    tabAnnonceVendeur.push(
      profilUser.annonce_vendeur[profilUser.annonce_vendeur.length - 1]
    );
    tabAnnonceVendeur.push(
      profilUser.annonce_vendeur[profilUser.annonce_vendeur.length - 2]
    );
    tabAnnonceVendeur.push(
      profilUser.annonce_vendeur[profilUser.annonce_vendeur.length - 3]
    );

    let tabAnnonceAcheteur = [];
    tabAnnonceAcheteur.push(
      profilUser.annonce_acheteur[profilUser.annonce_acheteur.length - 1]
    );
    tabAnnonceAcheteur.push(
      profilUser.annonce_acheteur[profilUser.annonce_acheteur.length - 2]
    );
    tabAnnonceAcheteur.push(
      profilUser.annonce_acheteur[profilUser.annonce_acheteur.length - 3]
    );

    console.log("l425", tabAnnonceVendeur);
    console.log("l426", tabAnnonceAcheteur);
    // console.log("l426", tabAnnonceAcheteur);

    const valueTabAnnVendeur1 = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(tabAnnonceVendeur[0]) });
    const valueTabAnnVendeur2 = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(tabAnnonceVendeur[1]) });
    const valueTabAnnVendeur3 = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(tabAnnonceVendeur[2]) });

    // console.log(valueTabAnnVendeur3)
    let recupValVendeur = [
      valueTabAnnVendeur1,
      valueTabAnnVendeur2,
      valueTabAnnVendeur3,
    ];

    console.log("l428", recupValVendeur);
    // console.log("l422", valueTabAnnVendeur)

    const valueTabAnnAcheteur1 = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(tabAnnonceAcheteur[0]) });
    const valueTabAnnAcheteur2 = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(tabAnnonceAcheteur[1]) });
    const valueTabAnnAcheteur3 = await db
      .collection("Annonces")
      .findOne({ _id: MongoClient.ObjectId(tabAnnonceAcheteur[2]) });

    let recupValAcheteur = [
      valueTabAnnAcheteur1,
      valueTabAnnAcheteur2,
      valueTabAnnAcheteur3,
    ];

    console.log("l437", recupValAcheteur);

    if (!req.session || !req.session.accessToken) {
      res.render("pages/profil", { users, isLoggedIn: false });

      return;
    }
    try {
      await oauthClient.verifyJWT(
        req.session.accessToken,
        process.env.JWT_ALGORITHM || ""
      );

      res.render("pages/profil", {
        users,
        isLoggedIn: true,
        recupValVendeur,
        recupValAcheteur,
      });
    } catch (error) {
      req.session.destroy(() => {
        res.render("pages/profil", { users, isLoggedIn: false });
        console.error(error);
      });
    }
  });


  app.get("/api/logout", sessionParser, async (req, res) => {
    if (req.session) {
      req.session.destroy(() => {
        res.redirect("/");
      });
    }
  });

  app.get("/auth/callback", sessionParser, async (req, res) => {
    const stringiAuthCode = `${req.query.code}`;
    const token = await oauthClient.getTokensFromAuthorizationCode(
      stringiAuthCode
    );


    //code qui permet de décoder le token
    const [header, payload] = token.id_token.split(".");

    const decodedHeader = OAuth2Client.decodeJWTPart(header);
    const decodedPayload = OAuth2Client.decodeJWTPart(payload);

    // récupère l'email du token
    const dataEmailUser = decodedPayload.email;
    // console.log("email du token :" + dataEmailUser);

    // rechercher si  l'email est déjà enregistré dans la bd

    // on recherche dans la db si le mail y est déjà enregistré

    const dataEmailBd = await db
      .collection("Users")
      .findOne({ mail: dataEmailUser });

    // console.log("email de la db", dataEmailBd);

    // on déclare une variable dont la valeur est vide
    let dataEmailBdUser = "";

    // si le champ email de la bd n'est pas vide, alors l'email de l'user est déjà enregistré dans la bd
    if (dataEmailBd !== null) {
      dataEmailBdUser = dataEmailBd.mail;
      // console.log("email bd user ", dataEmailBdUser);
    }

    // si le compte existe déjà, on crée le cookie en mémorisant le mail
    if (dataEmailUser === dataEmailBdUser && req.session) {
      req.session.accessToken = token.access_token;
      req.session.mail = dataEmailUser;
    } else if (dataEmailBd === null) {
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

      // exécuter insertOne que si l'email n'est pas enregistré dans la BD
    }
    res.redirect("/");
  });

  app.post(
    "/api/creation_annonce",
    sessionParser,
    upload.single("file"),
    async (req, res) => {
      if (req.file) {
        const tempPath = req.file.path;
        const newPath = tempPath + ".png";
        const dbPath = "/static/uploads/" + req.file.filename + ".png";


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
          image: dbPath,
          ville: dataForm.ville,
          mobilier: dataForm.mobilier,
          description: dataForm.description,
        };

        const result = await db.collection("Annonces").insertOne(annonce);
        const createdId = result.insertedId;

        const logguedUserEmail = req.session.mail;

        const Id = await db
          .collection("Users")
          .updateOne(
            { mail: logguedUserEmail },
            { $push: { annonce_vendeur: createdId } }
          );

        if (path.extname(req.file.originalname).toLowerCase() === ".png") {
          fs.rename(tempPath, newPath, (err) => {

            res.status(200).redirect(`/locations/${createdId}`);
          });
        } else {
          fs.unlink(tempPath, (err) => {

            res.status(403).redirect(`/locations/${createdId}`);
          });
        }
      } else {
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
        const createdId = result.insertedId;


        const logguedUserEmail = req.session.mail;
        // const user = await db.collection("users").findOne({mail:logguedUserEmail});
        const Id = await db
          .collection("Users")
          .updateOne(
            { mail: logguedUserEmail },
            { $push: { annonce_vendeur: createdId } }
          );
        res.status(200).redirect(`/locations/${createdId}`);
      }
      // }
      // );

      //console.log(Id);
      // trouver le user dans la collection Users

      //console.log("j'ai reussi");

      // trouver dans mongodb comment patch un tableau de donnee
      // dans le user en question : rajouter l'id de l'annonce dans le tableau dans "annonce_vendeur"

      //     var cookieSession = require('cookie-session');
      //     app.use(cookieSession({
      //     keys: ['secret1', 'secret2']
      // }));
      // console.log(createdId);

      //     var cookieSession = require('cookie-session');
      //     app.use(cookieSession({
      //     keys: ['secret1', 'secret2']
      // }));


        const logguedUserEmail = req.session.mail;


        const Id = await db
          .collection("Users")
          .updateOne(
            { mail: logguedUserEmail },
            { $push: { annonce_vendeur: createdId } }
          );
        res.status(200).redirect(`/locations/${createdId}`);
      }
    
  );


  app.post("/locations", async (req, res) => {
    // on recherche les données saisies par l'user dans le formulaire
    const dbPath = "/static/uploads/" + req.file.filename + ".png";

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
      image: dbPath,
    };

    // on insère les données saisies de l'user dans la BD
    db.collection("Annonces").insertOne({ annonce });

    res.render("pages/location");
  });

  app.get("/api/login", async (req, res) => {
    res.send("result");
  });

  app.post("/api/login", async (req, res) => {
    res.send("result");
  });

  // This should be the last call to `app` in this file
  app.use("/static", express.static("public"));
  app.use((error, req, res) => {});

  return app;
}

module.exports = { makeApp };
