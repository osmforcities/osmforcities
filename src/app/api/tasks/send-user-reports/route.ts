import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { generateNextUserReport } from "@/lib/tasks/user-report";

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
    const report = await generateNextUserReport();

    if (!report) {
      return NextResponse.json({
        success: true,
        message: "No users need notification at this time",
        data: {
          usersNotified: 0,
          reason:
            "All users were notified within their configured frequency window",
        },
      });
    }

    const { userId, userEmail, emailContent, reportData } = report;

    // DEFENSIVE: Update database FIRST to prevent spam if schema issues exist
    // Better to miss one email than spam the user
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastReportSent: new Date() },
      });
    } catch (dbError) {
      console.error("Database update failed, skipping email to prevent spam:", dbError);
      return NextResponse.json({
        success: false,
        error: "Database update failed, email skipped to prevent spam",
        details: dbError instanceof Error ? dbError.message : "Unknown database error",
      }, { status: 500 });
    }

    // Only send email AFTER successful database update
    await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      message: "Dataset status report sent successfully",
      data: {
        userEmail: userEmail,
        reportsFrequency: reportData.reportsFrequency,
        totalDatasets: reportData.totalDatasets,
        publicDatasets: reportData.publicDatasetsCount,
        latestChange: reportData.latestChangeDate,
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
