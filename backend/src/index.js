import "dotenv/config"; // must be first, so process.env is ready for every other file
import http from "http";
import app from "./app.js";
import { connectDB } from "./configs/db.js";
import { initSocket } from "./sockets/socketManager.js";
import Participant from "./models/Participant.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.error("Missing MONGO_URI or JWT_SECRET. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  await connectDB();

  // After a restart no socket is connected anymore, so nobody can still be "online"
  await Participant.updateMany(
    { isOnline: true },
    { isOnline: false, socketId: null, leftAt: new Date(), isHandRaised: false, isScreenSharing: false, isFeatured: false }
  );

  const server = http.createServer(app); // Express and Socket.IO share one HTTP server
  const io = initSocket(server);
  app.set("io", io); // controllers read it with req.app.get("io")

  server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
