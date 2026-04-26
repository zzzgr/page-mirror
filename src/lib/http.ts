export function prefersJson(request: Request) {
  const accept = request.headers.get("Accept") || "";
  const contentType = request.headers.get("Content-Type") || "";
  return accept.includes("application/json") || contentType.includes("application/json");
}
