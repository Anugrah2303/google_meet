import User from "../models/User.js";
import { verifyToken } from "../utils/generateToken.js";

function readTokenFromCookie(cookieHeader = "") {
  const pair = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith("token="));
  return pair ? decodeURIComponent(pair.slice("token=".length)) : null;
}

/*
  Runs once per connection, before "connection" fires.
  Client: io(URL, { auth: { token } })   (or the HTTP-only cookie is sent automatically)
  After this, socket.user is the REAL user from the database. We never trust a userId sent by the client.
*/
export async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || readTokenFromCookie(socket.handshake.headers.cookie);
    if (!token) return next(new Error("Authentication token missing"));

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error(error.name === "TokenExpiredError" ? "Token expired" : "Invalid token"));
  }
}
