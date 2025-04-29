$(document).ready(function () {
  // Conexión al servidor Socket.IO
  var socket = io();

  // Escucha el evento 'user' para recibir datos sobre los usuarios conectados/desconectados
  socket.on("user", function (data) {
    // Actualizar el número de usuarios conectados
    $("#num-users").text(data.currentUsers + " users online");

    // Crear el mensaje de quien se unió o se fue
    var message =
      data.username +
      (data.connected ? " has joined the chat." : " has left the chat.");

    // Agregar el mensaje al chat
    $("#messages").append($("<li>").html("<b>" + message + "</b>"));
  });

  // Lógica para enviar mensajes o realizar otras interacciones según tu necesidad
  $("form").submit(function () {
    const messageToSend = $("#m").val();
    socket.emit("chat message", messageToSend); // ✨ Emitimos mensaje
    $("#m").val(""); // Limpiamos el input
    return false; // Evita que se refresque la página
  });
  socket.on("chat message", (data) => {
    $("#messages").append($("<li>").text(`${data.username}: ${data.message}`));
  });
});
