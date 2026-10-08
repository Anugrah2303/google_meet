import { Server } from "socket.io";
import { getAllowedOrigins } from "../configs/cors.js";
import { socketAuth } from "./socketAuth.js";
import { registerMeetingHandlers } from "./meetingSocket.js";
import { registerSignalingHandlers } from "./signalingSocket.js";
import { registerChatHandlers } from "./chatSocket.js";
import { registerParticipantHandlers } from "./participantSocket.js";
import { registerPermissionHandlers } from "./permissionSocket.js";

/*
  Socket.IO flow:
  Client  --event-->  Server handler  --io.to(room).emit-->  Other clients
  A "room" is just a named group of sockets. We use one room per meeting (room name = meetingId).
*/
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: getAllowedOrigins(), credentials: true },
  });

  io.use(socketAuth); // rejects connections without a valid JWT

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.user.name})`);

    registerMeetingHandlers(io, socket);
    registerSignalingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerParticipantHandlers(io, socket);
    registerPermissionHandlers(io, socket);
  });

  return io;
}
