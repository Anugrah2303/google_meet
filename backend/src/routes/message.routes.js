import express from "express";
import { deleteMessage } from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateIdParam } from "../utils/validateObjectId.js";

const router = express.Router();
router.use(protect);
router.param("messageId", validateIdParam);

router.delete("/:messageId", deleteMessage);

export default router;
