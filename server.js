require("dotenv").config();
const { sequelize } = require("./models");
const app = require("./app");

const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;

sequelize
  .authenticate()
  .then(async () => {
    console.log("Connected to the database");
    await sequelize.sync();

    console.log("Database synced");

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: "*",
      },
    });

    app.locals.io = io;

    io.on("connection", (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on("joinRoom", (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      });

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });
