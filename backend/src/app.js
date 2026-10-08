import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import routes from "./routes/index.js";
import { getAllowedOrigins } from "./configs/cors.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

const app = express();

// Security headers. "cross-origin" lets the frontend (another origin) show uploaded files.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// credentials: true is needed for cookies, and then origin cannot be "*"
app.use(cors({ origin: getAllowedOrigins(), credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Slow down password guessing on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later", error: {} },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Locally stored files (used when Cloudinary is not configured). Names are random UUIDs.
app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
