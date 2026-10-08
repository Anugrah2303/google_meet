// CLIENT_URL can hold one URL or several URLs separated by commas
export function getAllowedOrigins() {
  return (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}
