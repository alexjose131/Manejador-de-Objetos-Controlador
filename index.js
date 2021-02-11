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

  //  replicar
  socket.on("replicar", function (data, fn) {
    let seReplico;

    // se conecta al servidor de replica 1
    const socket_2 = io(
      "http://" +
        process.env.SERVER_BACKUP_1_IP +
        ":" +
        process.env.SERVER_BACKUP_1_PORT
    );

    // vote_request 1
    socket_2.emit("VOTE_REQUEST", data.accion, function (res) {
      console.log("esta es la respuesta de la replica 1", res);

      // se conecta al servidor de replica 2
      const socket_3 = io(
        "http://" +
          process.env.SERVER_BACKUP_2_IP +
          ":" +
          process.env.SERVER_BACKUP_2_PORT
      );

      if (res === "VOTE_COMMIT") {
        // vote_request 2
        socket_3.emit("VOTE_REQUEST", data.accion, function (res2) {
          console.log("esta es la respuesta de la replica 2", res2);
          if (res2 === "VOTE_COMMIT") {
            globalCommit(socket_2, socket_3, data.objetos);
            seReplico = true;
            fn(seReplico);
            socket.disconnect();
          } else {
            seReplico = false;
            fn(seReplico);
            socket.disconnect();
          }
        });
      } else {
        globalAbort(socket_2, socket_3);
        seReplico = false;
        fn(seReplico);
        socket.disconnect();
      }
    });
  });
});

function globalCommit(s2, s3, datos) {
  s2.emit("GLOBAL_COMMIT", datos, function (res_global_commit) {
    console.log(
      "esta es la respuesta de la replica 1 al global_commit",
      res_global_commit
    );
  });

  s3.emit("GLOBAL_COMMIT", datos, function (res_global_commit) {
    console.log(
      "esta es la respuesta de la replica 2 al global_commit",
      res_global_commit
    );
  });

  console.log("GLOBAL COMMIT SATISFACTORIO");
}

function globalAbort(s2, s3) {
  s2.emit("GLOBAL_ABORT", function (res_global_abort) {
    console.log(
      "esta es la respuesta de la replica 1 al global_abort",
      res_global_abort
    );
  });

  s3.emit("GLOBAL_ABORT", function (res_global_abort) {
    console.log(
      "esta es la respuesta de la replica 2 al global_abort",
      res_global_abort
    );
  });
}

http.listen(app.get("port"), () => {
  console.log(`Server running in port ${app.get("port")}`);
  console.log(path.join(__dirname, "public"));
});
