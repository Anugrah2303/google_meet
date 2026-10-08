import express from "express";
import {
  getMyProfile,
  getUserById,
  updateMyAvatar,
  updateMyProfile,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadAvatarFile } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { validateIdParam } from "../utils/validateObjectId.js";
import { updateProfileSchema } from "../validations/user.validation.js";

const router = express.Router();
router.use(protect);
router.param("id", validateIdParam);

router.get("/me", getMyProfile);
router.patch("/me", validate(updateProfileSchema), updateMyProfile);
router.patch("/me/avatar", uploadAvatarFile, updateMyAvatar);
router.get("/:id", getUserById);

export default router;
