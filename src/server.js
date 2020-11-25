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

function makeApp(db) {
  const app = express();
  const jsonParser = bodyParser.json();

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  app.set("view engine", "njk");

  const MongoStore = mongoSession(session);

  const sessionParser = session({
    secret: "rEqcX9FdBQtYGxsunwQocIFp02-Mler7NctrZotIXME=",
    name: "TempOffice",
    resave: false,
    saveUninitialized: true,
    // store: new MongoStore({
    //   client: MongoClient,
    // }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 3600000),
    },
  });

  const oauthClientConstructorProps = {
    openIDConfigurationURL:
      "https://fewlines.connect.prod.fewlines.tech/.well-known/openid-configuration",
    clientID: `${process.env.CLIENT_ID}`,
    clientSecret: `${process.env.CLIENT_SECRET}`,
    redirectURI: "http://localhost:8080/oauth/callback",
    audience: `${process.env.AUDIENCE}`,
    scopes: ["openid", "email"],
  };

  //   PORT=8080
  // MONGO_URI="mongodb+srv://Riam:maman@cluster0.v2iwm.mongodb.net/Batch1?retryWrites=true&w=majority"
  // SESSIONSECRET='sMP282xYjhTKxkhnZnfADtaymsuDFuAc'
  // OPEN_ID='https://fewlines.connect.prod.fewlines.tech/.well-known/openid-configuration'
  // CLIENT_ID='ggtpH9bmNWV2Z4_aNS1aYw=='
  // CLIENT_SECRET='rEqcX9FdBQtYGxsunwQocIFp02-Mler7NctrZotIXME='
  // AUDIENCE='tempoffice'
  // NAME='tempoffice'
  // JWT_ALGORITHM='RS256'
  // OAUTH_CALLBACK_URL='http://localhost:8080/oauth/callback'

  const oauthClient = new OAuth2Client.default(oauthClientConstructorProps);

  app.get("/", async (req, res) => {
    res.render("pages/home");
    // console.log("coucou");
  });

  app.get("/locations", async (req, res) => {
    res.render("pages/location");
  });

  app.get("/locations/:location_id", async (req, res) => {
    res.send("la location 1");
  });
  app.post("/locations/:location_id", async (req, res) => {
    res.send("la location 1 POST");
  });

  //  annonce qui se retrouve sur la page la location (
  app.get("api/creation_annonce", async (req, res) => {
    const result = " veuillez vous logger";
    // await db.collection("").findOne;
    //console.log(result);
    res.send("result");
  });
  //  création de l'annonce par le vendeur (
  app.post("api/creation_annonce", async (req, res) => {});

  app.get("/api/login", async (req, res) => {
    const authURL = await oauthClient.getAuthorizationURL("state");

    const authURLinString = authURL.toString();
    res.redirect(authURLinString);
  });

  app.get("/api/logout", sessionParser, async (req, res) => {
    if (req.session) {
      req.session.destroy(() => {
        res.render("pages/home", { isLoggedIn: false });
      });
    }
  });

  app.get("/oauth/callback", sessionParser, async (req, response) => {
    const stringiAuthCode = `${request.query.code}`;
    const token = await oauthClient.getTokensFromAuthorizationCode(
      stringiAuthCode
    );
    console.log(token);
    if (request.session) {
      request.session.accessToken = token.access_token;
    }
    response.redirect("/");
  });

  app.get("/api/login", async (req, res) => {
    res.send("result");
  });

  app.post("/api/login", async (req, res) => {
    res.send("result");
  });

  // This should be the last call to `app` in this file
  app.use("/static", express.static("public"));
  app.use((error, req, res) => {
    console.error(error);
  });

  return app;
}

module.exports = { makeApp };

// app.get("/platforms", async (request, response) => {
//   const platformList = await db.collection("platforms").find().toArray();
//   response.json(platformList);
// });

// app.get("/platforms/:slug", async (request, response) => {
//   const platform = await db
//     .collection("platforms")
//     .findOne({ slug: request.params.slug });

//   if (platform) {
//     response.json(platform);
//   } else {
//     response.status(404).end();
//   }
// });

// app.post(
//   "/platforms",
//   jsonParser,
//   async (request, response) => {
//     const errors = [];
//     if (!request.body.name) {
//       errors.push("name");
//     }
//     if (errors.length > 0) {
//       return response
//         .status(400)
//         .json({ error: "Missing required fields", missing: errors });
//     }

//     const platform = await db
//       .collection("platforms")
//       .findOne({ name: request.body.name });

//     if (platform) {
//       return response
//         .status(400)
//         .json({ error: "A platform of this name already exists" });
//     }

//     const slug = slugify(request.body.name);
//     const createdPlatform = {
//       name: request.body.name,
//       slug: slug,
//     };

//     db.collection("platforms")
//       .insertOne(createdPlatform)
//       .then(() => {
//         response.status(201).json(createdPlatform);
//       });
//   }
// );

// app.put(
//   "/platforms/:slug",
//   jsonParser,
//   async (request: Request, response) => {
//     const errors = [];
//     if (!request.body.name) {
//       errors.push("name");
//     }
//     if (errors.length > 0) {
//       return response
//         .status(400)
//         .json({ error: "Missing required fields", missing: errors });
//     }

//     const platform = await db
//       .collection("platforms")
//       .findOne({ slug: request.params.slug });
//     if (platform) {
//       const newPlatform = { ...platform, ...request.body };
//       await db
//         .collection("platforms")
//         .replaceOne({ _id: platform._id }, newPlatform);

//       response.status(204).end();
//     } else {
//       response.status(404).end();
//     }
//   }
// );

// app.delete(
//   "/platforms/:slug",
//   jsonParser,
//   async (request: Request, response: Response) => {
//     const platform = await db
//       .collection("platforms")
//       .findOne({ slug: request.params.slug });
//     if (platform) {
//       await db.collection("platforms").deleteOne({ _id: platform._id });

//       response.status(204).end();
//     } else {
//       response.status(404).end();
//     }
//   }
// );

// app.get(
//   "/platforms/:slug/games",
//   async (request: Request, response: Response) => {
//     const games = await db
//       .collection("games")
//       .find({ platform_slug: request.params.slug })
//       .toArray();
//     response.json(games);
//   }
// );

// app.get("/games", async (request: Request, response: Response) => {
//   const games = await db.collection("games").find().toArray();
//   response.json(games);
// });

// app.get("/games/:slug", async (request: Request, response: Response) => {
//   const game = await db.collection("games").findOne({
//     slug: request.params.slug,
//   });
//   if (game) {
//     response.json(game);
//   } else {
//     response.status(404).end();
//   }
// });

// app.post(
//   "/games",
//   jsonParser,
//   async (request: Request, response: Response) => {
//     const errors = [];
//     if (!request.body.name) {
//       errors.push("name");
//     }
//     if (!request.body.platform_slug) {
//       errors.push("platform_slug");
//     }
//     if (errors.length > 0) {
//       return response
//         .status(400)
//         .json({ error: "Missing required fields", missing: errors });
//     }
//     const alreadyExistingGame = await db.collection("games").findOne({
//       name: request.body.name,
//       platform_slug: request.body.platform_slug,
//     });

//     if (alreadyExistingGame) {
//       return response
//         .status(400)
//         .json({ error: "A game of this name already exists" });
//     }

//     const platform = await db
//       .collection("platforms")
//       .findOne({ slug: request.body.platform_slug });

//     if (platform) {
//       const slug = slugify(request.body.name);
//       const createdGame = {
//         name: request.body.name,
//         slug: slug,
//         platform_slug: platform.slug,
//       };

//       db.collection("games").insertOne(createdGame);
//       response.status(201).json(createdGame);
//     } else {
//       response.status(400).json({ error: "This platform does not exist" });
//     }
//   }
// );

// app.delete("/games/:slug", async (request: Request, response: Response) => {
//   const game = await db
//     .collection("games")
//     .findOne({ slug: request.params.slug });
//   if (game) {
//     await db.collection("games").deleteOne({ _id: game._id });

//     response.status(204).end();
//   } else {
//     response.status(404).end();
//   }
// });

// app.put(
//   "/games/:slug",
//   jsonParser,
//   async (request: Request, response: Response) => {
//     const errors = [];
//     if (!request.body.name) {
//       errors.push("name");
//     }
//     if (!request.body.platform_slug) {
//       errors.push("platform_slug");
//     }
//     if (errors.length > 0) {
//       return response
//         .status(400)
//         .json({ error: "Missing required fields", missing: errors });
//     }
//     const game = await db
//       .collection("games")
//       .findOne({ slug: request.params.slug });
//     if (game) {
//       const newGame = { ...game, ...request.body };
//       await db.collection("games").replaceOne({ _id: game._id }, newGame);

//       response.status(204).end();
//     } else {
//       response.status(404).end();
//     }
//   }
// );
