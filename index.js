import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import router from "./routes";
import dotenv from "dotenv";
import { io } from "socket.io-client";

dotenv.config();
const app = express();
const http = require("http").Server(app);
const io_server = require("socket.io")(http);

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", router);
app.set("port", process.env.PORT || 3000);

io_server.on("connection", function (socket) {
  console.log("Usuario conectado al coordinador", socket.handshake.address);

  replicarObjeto(socket);
});

http.listen(app.get("port"), () => {
  console.log(`Server running in port ${app.get("port")}`);
  console.log(path.join(__dirname, "public"));
});

function replicarObjeto(socket) {
  //  replicar
  socket.on("replicar", (data1) => {
    // se conecta al servidor de replica 1

    const socket_2 = io(
      "http://" +
        process.env.SERVER_BACKUP_1_IP +
        ":" +
        process.env.SERVER_BACKUP_1_PORT
    );

    // vote_request 1

    socket_2.emit("VOTE_REQUEST", data1.accion, function (res) {
      console.log("esta es la respuesta de la replica 1", res);

      if (res === "VOTE_COMMIT") {
        // se conecta al servidor de replica 2

        const socket_3 = io(
          "http://" +
            process.env.SERVER_BACKUP_2_IP +
            ":" +
            process.env.SERVER_BACKUP_2_PORT
        );

        // vote_request 2

        socket_3.emit("VOTE_REQUEST", data1.accion, function (res2) {
          console.log("esta es la respuesta de la replica 2", res2);
          if (res2 === "VOTE_COMMIT") {
            globalCommit();
          }
        });
      } else {
        console.log("no devolvio vote_commit");
      }
    });
    // devuelve un mensaje de error
  });

  //  restaurar
  socket.on("restaurar", () => {
    console.log("Comienza la restauración");
  });

  // respuesta del servidor de replica
  socket.emit("respuesta", "esta es la respuesta");

  //se desconecta el socket
  socket.on("disconnect", function () {
    console.log("A user disconnected");
  });
}

function globalCommit() {
  // enviar a los 2 servidores de replica
  // const socket = io(
  //   "http://" +
  //     process.env.SERVER_BACKUP_1_IP +
  //     ":" +
  //     process.env.SERVER_BACKUP_1_PORT
  // );

  // socket.on("connect", () => {
  //   socket.emit("GLOBAL_COMMIT", data.objetos);
  // });

  console.log("GLOBAL COMMIT SATISFACTORIO");
}
