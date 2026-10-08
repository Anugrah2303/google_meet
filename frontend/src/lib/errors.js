// Backend errors look like { success:false, message, error } (see error.middleware.js)
export function getErrorMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}
