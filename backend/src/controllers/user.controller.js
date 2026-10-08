import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { saveUploadedFile } from "../services/storage.service.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Profile fetched", { user: req.user });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  // Only allow fields we expect. Never let users change role or email here.
  req.user.name = req.body.name;
  await req.user.save();
  sendResponse(res, 200, "Profile updated", { user: req.user });
});

export const updateMyAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Please choose an image (form field name: avatar)");

  const stored = await saveUploadedFile({ file: req.file, folder: "avatars", resourceType: "image" });
  req.user.avatar = stored.url;
  await req.user.save();

  sendResponse(res, 200, "Avatar updated", { user: req.user });
});

// Public profile: no email, no role
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("name avatar createdAt");
  if (!user) throw new ApiError(404, "User not found");
  sendResponse(res, 200, "User fetched", { user });
});

