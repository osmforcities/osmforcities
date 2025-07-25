import { prisma } from "@/lib/db";
import { htmlToText } from "html-to-text";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface DatasetStats {
  user: {
    id: string;
    email: string;
    reportsFrequency: "DAILY" | "WEEKLY";
  };
  recentDatasets: Array<{
    id: string;
    name: string;
    lastChanged: Date | null;
  }>;
}

function generateEmailContent(data: DatasetStats): EmailContent {
  const { user, recentDatasets } = data;
  const frequency = user.reportsFrequency;

  const recentDatasetsList = recentDatasets
    .map(
      (ds) =>
        `🔥 ${ds.name}: ${ds.lastChanged?.toLocaleDateString() || "Unknown"}`
    )
    .join("\n");

  const hasRecentChanges = recentDatasets.length > 0;

  let subject = "";
  if (hasRecentChanges) {
    subject = `${recentDatasets.length} dataset${
      recentDatasets.length === 1 ? "" : "s"
    } changed in the last ${frequency === "DAILY" ? "day" : "week"}`;
  } else {
    subject = `No changes in the last ${
      frequency === "DAILY" ? "day" : "week"
    }`;
  }

  const htmlContent = `
    <p>Hi! ${
      hasRecentChanges
        ? `${recentDatasets.length} of your public dataset${
            recentDatasets.length === 1 ? "" : "s"
          } had changes in the last ${
            frequency === "DAILY" ? "day" : "week"
          }:</p>
    
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${recentDatasetsList}</pre>`
        : `There were no changes on the datasets you are watching in the last ${
            frequency === "DAILY" ? "day" : "week"
          }.</p>
    
    <p><a href="${
      process.env.NEXTAUTH_URL || "https://osmforcities.com"
    }/watched" style="color: #007bff; text-decoration: none;">Visit your profile to see the list of datasets you are watching</a></p>`
    }
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
    <p style="color: #666; font-size: 14px;">
      To unsubscribe from these reports, 
      <a href="${
        process.env.NEXTAUTH_URL || "https://osmforcities.org"
      }/preferences" style="color: #007bff; text-decoration: none;">visit your preferences page</a>.
    </p>
  `;

  return {
    subject,
    html: htmlContent,
    text: htmlToText(htmlContent),
  };
}

export async function generateNextUserReport(): Promise<{
  userId: string;
  userEmail: string;
  emailContent: EmailContent;
  reportData: {
    reportsFrequency: "DAILY" | "WEEKLY";
    publicDatasetsCount: number;
    latestChangeDate: string | null;
  };
} | null> {
  const user = await prisma.user.findFirst({
    where: {
      reportsEnabled: true,
      OR: [
        { lastReportSent: null },
        {
          AND: [
            { reportsFrequency: "DAILY" },
            {
              lastReportSent: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        {
          AND: [
            { reportsFrequency: "WEEKLY" },
            {
              lastReportSent: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      reportsFrequency: true,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  let since: Date;
  if (user.reportsFrequency === "DAILY") {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const recentDatasets = await prisma.dataset.findMany({
    where: {
      userId: user.id,
      isPublic: true,
      updatedAt: {
        gte: since,
      },
    },
    select: {
      id: true,
      cityName: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const datasetStats: DatasetStats = {
    user: {
      id: user.id,
      email: user.email,
      reportsFrequency: user.reportsFrequency,
    },
    recentDatasets: recentDatasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.cityName,
      lastChanged: dataset.updatedAt,
    })),
  };

  const emailContent = generateEmailContent(datasetStats);
  const latestChangeDate =
    recentDatasets.length > 0
      ? recentDatasets[0].updatedAt.toLocaleDateString()
      : null;

  return {
    userId: user.id,
    userEmail: user.email,
    emailContent,
    reportData: {
      reportsFrequency: user.reportsFrequency,
      publicDatasetsCount: datasetStats.recentDatasets.length,
      latestChangeDate,
    },
  };
}
