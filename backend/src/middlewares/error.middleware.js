import multer from "multer";
import { ZodError } from "zod";
import ApiError from "../utils/ApiError.js";

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express knows this is an error handler because it has 4 arguments
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  if (err instanceof ZodError) {
    statusCode = 422;
    message = "Validation failed";
    details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyValue || {})[0] || "Value"} already exists`;
  } else if (err instanceof multer.MulterError) {
    statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  }

  if (statusCode >= 500) {
    console.error("Unexpected error:", err);
    if (process.env.NODE_ENV === "production") message = "Something went wrong on the server";
  }

  res.status(statusCode).json({ success: false, message, error: details || {} });
}
