import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getFirstUserAndDatasetStats } from "@/lib/tasks/get-dataset-stats";
import { generateDatasetReportEmail } from "@/lib/tasks/generate-email";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const expectedSecret = process.env.CRON_ROUTE_SECRET;

  if (!expectedSecret) {
    console.error("CRON_ROUTE_SECRET environment variable not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (token !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const data = await getFirstUserAndDatasetStats();

    if (!data) {
      return NextResponse.json({
        success: true,
        message: "No users need notification at this time",
        data: {
          usersNotified: 0,
          reason: "All users were notified within the last 24 hours",
        },
      });
    }

    const emailContent = generateDatasetReportEmail(data);

    await sendEmail({
      to: data.user.email,
      subject: "OSM for Cities - Dataset Status Report",
      html: emailContent.html,
      text: emailContent.text,
    });

    await prisma.user.update({
      where: { id: data.user.id },
      data: { lastReportSent: new Date() },
    });

    const latestChangeDate =
      data.latestChange?.lastChanged?.toLocaleDateString() ||
      "No changes recorded";

    return NextResponse.json({
      success: true,
      message: "Dataset status report sent successfully",
      data: {
        userEmail: data.user.email,
        totalDatasets: data.totalDatasets,
        publicDatasets: data.publicDatasets.length,
        latestChange: latestChangeDate,
        usersNotified: 1,
      },
    });
  } catch (error) {
    console.error("Error in send-user-reports task:", error);
    return NextResponse.json(
      {
        error: "Failed to execute send-user-reports task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
