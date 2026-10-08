import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { generateToken, getCookieOptions } from "../utils/generateToken.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "An account with this email already exists");

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);

  res.cookie("token", token, getCookieOptions());
  sendResponse(res, 201, "Account created successfully", { user, token });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // password has select:false, so we must ask for it explicitly
  const user = await User.findOne({ email }).select("+password");
  const passwordMatches = user && (await user.comparePassword(password));

  // Same message for both cases so attackers cannot find out which emails exist
  if (!passwordMatches) throw new ApiError(401, "Invalid email or password");

  const token = generateToken(user._id);
  res.cookie("token", token, getCookieOptions());
  sendResponse(res, 200, "Logged in successfully", { user, token });
});

export const logout = asyncHandler(async (req, res) => {
  const { maxAge, ...cookieOptions } = getCookieOptions();
  res.clearCookie("token", cookieOptions);
  sendResponse(res, 200, "Logged out successfully");
});

export const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Current user fetched", { user: req.user });
});
