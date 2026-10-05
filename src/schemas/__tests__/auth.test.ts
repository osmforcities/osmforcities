import { describe, it, expect } from "vitest";
import { EmailSchema } from "@/schemas/auth";

describe("EmailSchema", () => {
  it("accepts a normal address", () => {
    expect(EmailSchema.safeParse("maria@example.com").success).toBe(true);
  });

  it("lowercases so case variants map to one account and one rate-limit key", () => {
    expect(EmailSchema.parse("Maria@Example.COM")).toBe("maria@example.com");
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
