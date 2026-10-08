import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import meetingRoutes from "./meeting.routes.js";
import messageRoutes from "./message.routes.js";
import fileRoutes from "./file.routes.js";
import recordingRoutes from "./recording.routes.js";

const router = express.Router();

router.get("/health", (req, res) => res.json({ success: true, message: "Server is running", data: {} }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/meetings", meetingRoutes);
router.use("/messages", messageRoutes);
router.use("/files", fileRoutes);
router.use("/recordings", recordingRoutes);

export default router;
