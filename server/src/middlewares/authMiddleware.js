import jwt from "jsonwebtoken";

export function authenticate(request, response, next) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Authorization token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded;
    return next();
  } catch (_error) {
    return response.status(401).json({ message: "Invalid or expired token" });
  }
}
