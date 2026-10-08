import express from "express";
import { deleteFile } from "../controllers/file.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateIdParam } from "../utils/validateObjectId.js";

const router = express.Router();
router.use(protect);
router.param("fileId", validateIdParam);

router.delete("/:fileId", deleteFile);

export default router;
