import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
