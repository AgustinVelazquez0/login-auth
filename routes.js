const passport = require("passport");

module.exports = function (app, myDataBase) {
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/");
  }

  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please log in",
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
    });
  });

  // Ruta para iniciar login con GitHub
  app.get("/auth/github", passport.authenticate("github"));

  // Ruta de callback de GitHub
  app
    .route("/auth/github/callback")
    .get(
      passport.authenticate("github", { failureRedirect: "/" }),
      (req, res) => {
        req.session.user_id = req.user.id;
        res.redirect("/chat");
      }
    );

  // Ruta para loguearse
  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/profile");
      }
    );

  // Ruta del perfil iniciado
  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", { username: req.user.username });
  });

  // Ruta para cerrar sesión
  app.route("/logout").get((req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

  // Ruta para registrar un nuevo usuario
  app.route("/register").post(
    (req, res, next) => {
      const bcrypt = require("bcrypt");
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect("/");
        } else {
          myDataBase.insertOne(
            {
              username: req.body.username,
              password: hash,
            },
            (err, doc) => {
              if (err) {
                res.redirect("/");
              } else {
                next(null, doc.ops[0]);
              }
            }
          );
        }
      });
    },
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/profile");
    }
  );

  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });

  // Ruta de Chat
  app.route("/chat").get(ensureAuthenticated, (req, res) => {
    res.render("chat", { user: req.user });
  });
};
