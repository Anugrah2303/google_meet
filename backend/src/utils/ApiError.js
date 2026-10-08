// An error that carries an HTTP status code, so the error middleware knows what to send back
export default class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
