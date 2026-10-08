import ApiError from "../utils/ApiError.js";

// validate(schema) checks req.body, validate(schema, "params") checks req.params
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return next(new ApiError(422, details[0]?.message || "Validation failed", details));
  }

  req[source] = result.data; // cleaned data (trimmed, defaults applied)
  next();
};
