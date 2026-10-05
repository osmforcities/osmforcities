import { describe, it, expect } from "vitest";
import { EmailSchema } from "@/schemas/auth";

describe("EmailSchema", () => {
  it("accepts a normal address", () => {
    expect(EmailSchema.safeParse("maria@example.com").success).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["non-string", 123],
    ["bare @", "@"],
    ["no domain", "maria@"],
    ["whitespace", "maria @example.com"],
    ["over 254 chars", `${"a".repeat(250)}@x.io`],
  ])("rejects %s", (_, value) => {
    expect(EmailSchema.safeParse(value).success).toBe(false);
  });
});
