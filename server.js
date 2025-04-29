"use strict";
require("dotenv").config();
const express = require("express");
const app = express(); // 🥇 Primero creamos "app"
const http = require("http").createServer(app); // 🥈 Después creamos "http"
const io = require("socket.io")(http); // 🥉 Después socket.io
const passportSocketIo = require("passport.socketio");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session); // MongoStore para las sesiones en MongoDB
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const passport = require("passport");

const routes = require("./routes.js");
const auth = require("./auth.js");

// Declaramos la variable para el contador de usuarios
let currentUsers = 0;

// Configuración de la tienda de sesiones en MongoDB
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

// Configuración de la sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }, // Establece secure: true si estás usando HTTPS
    store: store,
  })
);

// Autenticación de Passport para Socket.IO
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: "express.sid", // Nombre de la cookie que contiene la sesión
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  })
);

// Funciones de éxito y fracaso para la autorización
function onAuthorizeSuccess(data, accept) {
  console.log("Conexión exitosa a socket.io");
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log("Conexión fallida a socket.io:", message);
  accept(null, false);
}

app.set("view engine", "pug");
app.set("views", "./views/pug");

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); // For fCC testing purposes
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

myDB(async (client) => {
  const myDataBase = await client.db("database").collection("users");

  routes(app, myDataBase);
  auth(app, myDataBase);

  // 🛠️ Socket.io
  io.on("connection", (socket) => {
    console.log("A user has connected");
    console.log("Usuario conectado:", socket.request.user.username); // Mostrar el nombre de usuario

    ++currentUsers; // Incrementa el contador de usuarios

    // Emite el evento de conexión con el nombre de usuario, el contador y el estado de conexión
    io.emit("user", {
      username: socket.request.user.username,
      currentUsers,
      connected: true,
    });

    socket.on("disconnect", () => {
      console.log("A user has disconnected");
      --currentUsers; // Decrementa el contador

      // Emite el evento de desconexión con el nombre de usuario, el contador y el estado de desconexión
      io.emit("user", {
        username: socket.request.user.username,
        currentUsers,
        connected: false,
      });
    });

    socket.on("chat message", (message) => {
      io.emit("chat message", {
        username: socket.request.user.username,
        message: message,
      });
    });
  });
}).catch((e) => {
  app.route("/").get((req, res) => {
    res.render("index", { title: e, message: "Unable to connect to database" });
  });
});

// 🛎️ Escuchar en el server http
http.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + (process.env.PORT || 3000));
});
