import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export async function GET() {
  const version = packageJson.version;
  const commitHash =
    [
      process.env.COMMIT_HASH,
      process.env.VERCEL_GIT_COMMIT_SHA,
      process.env.GITHUB_SHA,
    ].find((value) => value && value !== "undefined") ?? "unknown";
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    version,
    commitHash,
    timestamp,
  });
}
