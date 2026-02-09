import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { generateNextUserReport, markReportSent } from "@/lib/tasks/user-report";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  const expectedSecret = process.env.CRON_ROUTE_SECRET;

  if (!expectedSecret) {
    console.error("CRON_ROUTE_SECRET environment variable not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (token !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    console.log("[send-user-reports] Starting report generation");
    const report = await generateNextUserReport();

    if (!report) {
      console.log("[send-user-reports] No users due for report");
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
    console.log(
      `[send-user-reports] Generated report for user ${userId} (${userEmail}), ` +
      `${reportData.totalDatasets} datasets changed`
    );

    console.log(`[send-user-reports] Sending email to ${userEmail}`);
    await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    console.log(`[send-user-reports] Email sent successfully to ${userEmail}`);

    try {
      await markReportSent(userId);
      console.log(
        `[send-user-reports] Updated lastReportSent for user ${userId}`
      );
    } catch (dbError) {
      console.error(
        `[send-user-reports] WARNING: Email sent to ${userEmail} but failed to update lastReportSent:`,
        dbError
      );
    }

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
    console.error("[send-user-reports] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute send-user-reports task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
