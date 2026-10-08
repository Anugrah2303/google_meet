import express from "express";
import { deleteRecording } from "../controllers/recording.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateIdParam } from "../utils/validateObjectId.js";

const router = express.Router();
router.use(protect);
router.param("recordingId", validateIdParam);

router.delete("/:recordingId", deleteRecording);

export default router;
