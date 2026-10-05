import { z } from "zod";

// 254 is the longest address SMTP can deliver to (RFC 5321 path limit).
// Lowercased because mail providers treat case variants as one inbox: without
// it each variant gets its own account and its own sign-in rate limit.
export const EmailSchema = z.string().max(254).email().toLowerCase();
