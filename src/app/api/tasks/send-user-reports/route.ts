import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { generateNextUserReport, markReportSent } from "@/lib/tasks/user-report";
import { createLogger } from "@/lib/logger";

const log = createLogger("send-user-reports");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    log.warn("Missing or invalid authorization header");
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  const expectedSecret = process.env.CRON_ROUTE_SECRET;

  if (!expectedSecret) {
    log.error("CRON_ROUTE_SECRET environment variable not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (token !== expectedSecret) {
    log.warn("Invalid cron secret provided");
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    log.info("Starting report generation");
    const report = await generateNextUserReport();

    if (!report) {
      log.info("No users due for report", { duration: Date.now() - startTime });
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
    log.info("Generated report", {
      userId,
      userEmail,
      totalDatasets: reportData.totalDatasets,
    });

    log.info("Sending email", { userId, userEmail });
    await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    log.info("Email sent successfully", { userId, userEmail });

    try {
      await markReportSent(userId);
      log.info("Updated lastReportSent", { userId });
    } catch (dbError) {
      log.error("Email sent but failed to update lastReportSent", {
        userId,
        userEmail,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }

    log.info("Report completed", {
      userId,
      userEmail,
      duration: Date.now() - startTime,
      datasets: reportData.totalDatasets,
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
    log.error("Report generation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      {
        error: "Failed to execute send-user-reports task",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
