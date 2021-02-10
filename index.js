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
  socket.on("replicar", (data) => {
    // console.log(
    //   "voteRequest1: ",
    //   voteRequest(data.accion, 1).then((datica) => {
    //     console.log("PROMESITA: ", datica);
    //   })
    // );
    // const voto = voteRequest(data.accion, 1);
    // console.log("voto arriba: ", voto);

    // se conecta al servidor de replica 1

    const socket_2 = io(
      "http://" +
        process.env.SERVER_BACKUP_1_IP +
        ":" +
        process.env.SERVER_BACKUP_1_PORT
    );

    // vote_request

    let voto1 = "def";

    socket_2.emit("VOTE_REQUEST", data.accion);

    socket_2.on("vote", (data) => {
      console.log("esta es la respuesta de la replica 1", data);

      const socket_3 = io(
        "http://" +
          process.env.SERVER_BACKUP_2_IP +
          ":" +
          process.env.SERVER_BACKUP_2_PORT
      );

      socket_3.emit("VOTE_REQUEST", data.accion);

      socket_3.on("vote", (data) => {
        console.log("esta es la respuesta de la replica 2", data);
        if (
          data === "VOTE_COMMIT"
          // &&  voteRequest(data.accion, 2) === "VOTE_COMMIT"
        ) {
          globalCommit();
        }
      });
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
});

http.listen(app.get("port"), () => {
  console.log(`Server running in port ${app.get("port")}`);
  console.log(path.join(__dirname, "public"));
});

// async function voteRequest(accion, numServidor) {
//   let socket;

//   if (numServidor === 1) {
//     console.log("Entra al vote_request 1");
//     socket = io(
//       "http://" +
//         process.env.SERVER_BACKUP_1_IP +
//         ":" +
//         process.env.SERVER_BACKUP_1_PORT
//     );
//     socket.on("connect", () => {
//       console.log("entra al connect del VOTE_REQUEST");

//       await new Promise(resolve => {
//         socket.emit("VOTE_REQUEST", accion, function (data) {
//           console.log("llegando al coordinador: ", data);
//           resolve(data) ;
//         });
//       })

//     });

//     // await new Promise((resolve) => {
//     //   socket.on("vote", (data) => {
//     //     console.log("Entra al vote y recibe: ", data);
//     //     resolve(data);
//     //   });
//     // });
//   } else if (numServidor === 2) {
//     console.log("Entra al vote_request 2");
//     socket = io(
//       "http://" +
//         process.env.SERVER_BACKUP_2_IP +
//         ":" +
//         process.env.SERVER_BACKUP_2_PORT
//     );
//   }

//   // console.log("voto abajo: ", voto);
//   // return setTimeout(() => {
//   //   console.log("esperé 5 seg");
//   //   return voto;
//   // }, 5000);
// }

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
