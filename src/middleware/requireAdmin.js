import { timingSafeEqual } from "node:crypto";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// مقارنة بزمن ثابت: لا تكشف كم حرفاً صحيحاً من المفتاح
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function requireAdmin(req, res, next) {
  // إن لم يُضبط مفتاح، نغلق الإدارة بالكامل بدل أن تبقى مفتوحة
  if (!ADMIN_API_KEY) {
    return res.status(503).json({ error: "Admin API is disabled" });
  }

  const header = req.get("Authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token || !safeEqual(token, ADMIN_API_KEY)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}