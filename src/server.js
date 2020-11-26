const express = require("express");
const bodyParser = require("body-parser");
// import * as core from "express-serve-static-core";
// import slugify from "slug";
const nunjucks = require("nunjucks");


function makeApp(db) {
  const app = express();
  const jsonParser = bodyParser.json();

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(bodyParser.json())

  app.set("view engine", "njk");

  app.get("/", async (req, res) => {
    res.render("pages/home");
    // console.log("coucou");
  });

  app.get("/locations", async (req, res) => {
    res.render("pages/location");
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
  
  app.post('/api/creation_annonce', function(req, res){
    const formData = req.body
    db.collection("Annonces").insertOne(formData);
    console.log(formData);
    res.end('');    
  })
// POUR L'INSTANT IL REDIRIGE VERS HOME 
// PAS CERTAIN QUE LES PHOTOS FONCTIONNENT
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
