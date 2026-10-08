import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/generateToken.js";

export const protect = asyncHandler(async (req, res, next) => {
  // 1. Read the token: "Authorization: Bearer xxx" or the HTTP-only cookie
  let token = null;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) throw new ApiError(401, "Not logged in. Token is missing");

  // 2. Verify it
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error.name === "TokenExpiredError") throw new ApiError(401, "Token expired. Please log in again");
    throw new ApiError(401, "Invalid token");
  }

  // 3. Find the user
  const user = await User.findById(decoded.userId);
  if (!user) throw new ApiError(401, "User no longer exists");

  // 4. Attach and continue
  req.user = user;
  next();
});
