import { Writable } from "node:stream";
import winston from "winston";
import { afterEach, describe, expect, it } from "vitest";
import { createLogger, logger } from "@/lib/logger";

const lines: string[] = [];
const capture = new winston.transports.Stream({
  stream: new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  }),
});

afterEach(() => {
  logger.remove(capture);
  lines.length = 0;
});

describe("createLogger", () => {
  it("keeps the message and stack of an Error passed in metadata", () => {
    logger.add(capture);
    createLogger("tiler").error("Bake ack failed", { error: new Error("boom") });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"context":"tiler"');
    expect(lines[0]).toContain("Error: boom");
    expect(lines[0]).toContain("logger.test.ts");
  });
});
