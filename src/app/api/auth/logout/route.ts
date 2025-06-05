import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth";
import { getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (sessionToken) {
      try {
        await deleteSession(sessionToken);
      } catch (error) {
        console.log("Session not found in database:", error);
      }
    }

    cookieStore.delete("session");

    return NextResponse.redirect(new URL("/", baseUrl));
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
