import { z } from "zod";

// 254 is the longest address SMTP can deliver to (RFC 5321 path limit).
export const EmailSchema = z.string().max(254).email();
