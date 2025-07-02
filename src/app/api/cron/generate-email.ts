import { DatasetStatsResult } from "./get-dataset-stats";
import { DatasetStats } from "@/schemas/dataset";

export interface EmailContent {
  html: string;
  text: string;
}

function isRecentlyEdited(lastChanged: Date | null): boolean {
  if (!lastChanged) return false;
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  return lastChanged >= oneDayAgo;
}

function hasRecentActivity(stats: DatasetStats | null): boolean {
  if (!stats?.recentActivity) return false;
  return (
    stats.recentActivity.elementsEdited > 0 ||
    stats.recentActivity.changesets > 0 ||
    stats.recentActivity.editors > 0
  );
}

export function generateDatasetReportEmail(
  data: DatasetStatsResult
): EmailContent {
  const { user, datasetStats, publicDatasets, latestChange, totalDatasets } =
    data;

  const latestChangeDate =
    latestChange?.lastChanged?.toLocaleDateString() || "No changes recorded";
  const latestChangeDataset = latestChange?.name || "N/A";

  // Separate datasets by activity
  const recentDatasets = datasetStats.filter((ds) =>
    isRecentlyEdited(ds.lastChanged)
  );
  const activeDatasets = datasetStats.filter(
    (ds) => hasRecentActivity(ds.stats) && !isRecentlyEdited(ds.lastChanged)
  );
  const inactiveDatasets = datasetStats.filter(
    (ds) => !hasRecentActivity(ds.stats) && !isRecentlyEdited(ds.lastChanged)
  );

  const recentDatasetsList = recentDatasets
    .map(
      (ds) =>
        `🔥 ${ds.name} (${ds.cityName}): ${
          ds.dataCount
        } objects, last changed: ${ds.lastChanged?.toLocaleDateString()}`
    )
    .join("\n");

  const activeDatasetsList = activeDatasets
    .map((ds) => {
      const activity = ds.stats?.recentActivity;
      const activityInfo = activity
        ? ` (${activity.elementsEdited} edits, ${activity.changesets} changesets, ${activity.editors} editors)`
        : "";
      return `⚡ ${ds.name} (${ds.cityName}): ${
        ds.dataCount
      } objects, last changed: ${
        ds.lastChanged?.toLocaleDateString() || "Unknown"
      }${activityInfo}`;
    })
    .join("\n");

  const inactiveDatasetsList = inactiveDatasets
    .map(
      (ds) =>
        `- ${ds.name} (${ds.cityName}): ${
          ds.dataCount
        } objects, last changed: ${
          ds.lastChanged?.toLocaleDateString() || "Unknown"
        }`
    )
    .join("\n");

  const hasRecentChanges = recentDatasets.length > 0;
  const hasActiveDatasets = activeDatasets.length > 0;

  const textContent = `
OSM for Cities - Dataset Status Report

Report generated for: ${user.name || user.email}

Summary:
- Total datasets: ${totalDatasets}
- Public datasets: ${publicDatasets.length}
- Latest change: ${latestChangeDate} (${latestChangeDataset})
${
  hasRecentChanges
    ? `- Recent changes: ${recentDatasets.length} dataset(s) updated in the last 24 hours`
    : ""
}
${
  hasActiveDatasets
    ? `- Active datasets: ${activeDatasets.length} dataset(s) with activity in the last 3 months`
    : ""
}

${
  hasRecentChanges
    ? `
🔥 RECENT CHANGES (Last 24 Hours):
${recentDatasetsList}

`
    : ""
}${
    hasActiveDatasets
      ? `
⚡ ACTIVE DATASETS (Last 3 Months):
${activeDatasetsList}

`
      : ""
  }All Datasets:
${recentDatasetsList}${
    recentDatasetsList && (activeDatasetsList || inactiveDatasetsList)
      ? "\n"
      : ""
  }${activeDatasetsList}${
    activeDatasetsList && inactiveDatasetsList ? "\n" : ""
  }${inactiveDatasetsList}
  `;

  const htmlContent = `
    <h1>OSM for Cities - Dataset Status Report</h1>
    <p><strong>Report generated for:</strong> ${user.name || user.email}</p>
    
    <h2>Summary</h2>
    <ul>
      <li><strong>Total datasets:</strong> ${totalDatasets}</li>
      <li><strong>Public datasets:</strong> ${publicDatasets.length}</li>
      <li><strong>Latest change:</strong> ${latestChangeDate} (${latestChangeDataset})</li>
      ${
        hasRecentChanges
          ? `<li><strong>Recent changes:</strong> ${recentDatasets.length} dataset(s) updated in the last 24 hours</li>`
          : ""
      }
      ${
        hasActiveDatasets
          ? `<li><strong>Active datasets:</strong> ${activeDatasets.length} dataset(s) with activity in the last 3 months</li>`
          : ""
      }
    </ul>

    ${
      hasRecentChanges
        ? `
    <h2>🔥 Recent Changes (Last 24 Hours)</h2>
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${recentDatasetsList}</pre>
    `
        : ""
    }

    ${
      hasActiveDatasets
        ? `
    <h2>⚡ Active Datasets (Last 3 Months)</h2>
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${activeDatasetsList}</pre>
    `
        : ""
    }

    <h2>All Datasets</h2>
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${recentDatasetsList}${
    recentDatasetsList && (activeDatasetsList || inactiveDatasetsList)
      ? "\n"
      : ""
  }${activeDatasetsList}${
    activeDatasetsList && inactiveDatasetsList ? "\n" : ""
  }${inactiveDatasetsList}</pre>
  `;

  return {
    html: htmlContent,
    text: textContent,
  };
}
