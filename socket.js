const socketio = require("socket.io");

let io;

function init(server) {
  if (io) return io;

  io = socketio(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    try {
      // client sends these values when connecting
      const { user_id, customer_id, restaurant_id, branch_id } =
        socket.handshake.query;

      if (user_id) socket.join(`user_${user_id}`);
      if (customer_id) socket.join(`customer_${customer_id}`);
      if (restaurant_id) socket.join(`restaurant_${restaurant_id}`);
      if (branch_id) socket.join(`branch_${branch_id}`);

      console.log(
        `Socket connected: socketId=${socket.id}, user=${
          user_id || "none"
        }, branch=${branch_id || "none"}, restaurant=${restaurant_id || "none"}`
      );

      socket.on("disconnect", () => {
        console.log("Socket disconnected", socket.id);
      });
    } catch (err) {
      console.error("Socket connection error", err);
    }
  });

  return io;
}

function getIo() {
  if (!io)
    throw new Error("Socket.io not initialized. Call init(server) first.");
  return io;
}

module.exports = { init, getIo };
