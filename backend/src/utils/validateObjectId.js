import ApiError from "./ApiError.js";

export const isValidObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

export function validateObjectId(id, name = "id") {
  if (!isValidObjectId(String(id))) throw new ApiError(400, `Invalid ${name}`);
}

// Used with router.param("meetingId", validateIdParam)
export function validateIdParam(req, res, next, value, name) {
  if (!isValidObjectId(value)) return next(new ApiError(400, `Invalid ${name}`));
  next();
}
