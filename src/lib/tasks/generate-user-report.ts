import { DatasetStats } from "./get-dataset-stats";

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

export function generateUserReport(data: DatasetStats): EmailContent {
  const { user, publicDatasets, latestChange, totalDatasets } = data;

  const latestChangeDate =
    latestChange?.lastChanged?.toLocaleDateString() || "No changes recorded";

  // Separate datasets by activity
  const recentDatasets = publicDatasets.filter((ds) =>
    isRecentlyEdited(ds.lastChanged)
  );
  const inactiveDatasets = publicDatasets.filter(
    (ds) => !isRecentlyEdited(ds.lastChanged)
  );

  const recentDatasetsList = recentDatasets
    .map(
      (ds) =>
        `🔥 ${ds.name}: ${ds.lastChanged?.toLocaleDateString() || "Unknown"}`
    )
    .join("\n");

  const inactiveDatasetsList = inactiveDatasets
    .map(
      (ds) =>
        `- ${ds.name}: ${ds.lastChanged?.toLocaleDateString() || "Unknown"}`
    )
    .join("\n");

  const hasRecentChanges = recentDatasets.length > 0;

  const textContent = `
OSM for Cities - Dataset Status Report

Report generated for: ${user.email}

Summary:
- Total datasets: ${totalDatasets}
- Public datasets: ${publicDatasets.length}
- Latest change: ${latestChangeDate}
${
  hasRecentChanges
    ? `- Recent changes: ${recentDatasets.length} dataset(s) updated in the last 24 hours`
    : ""
}

${
  hasRecentChanges
    ? `
🔥 RECENT CHANGES (Last 24 Hours):
${recentDatasetsList}

`
    : ""
}All Public Datasets:
${recentDatasetsList}${
    recentDatasetsList && inactiveDatasetsList ? "\n" : ""
  }${inactiveDatasetsList}
  `;

  const htmlContent = `
    <h1>OSM for Cities - Dataset Status Report</h1>
    <p><strong>Report generated for:</strong> ${user.email}</p>
    
    <h2>Summary</h2>
    <ul>
      <li><strong>Total datasets:</strong> ${totalDatasets}</li>
      <li><strong>Public datasets:</strong> ${publicDatasets.length}</li>
      <li><strong>Latest change:</strong> ${latestChangeDate}</li>
      ${
        hasRecentChanges
          ? `<li><strong>Recent changes:</strong> ${recentDatasets.length} dataset(s) updated in the last 24 hours</li>`
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

    <h2>All Public Datasets</h2>
    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${recentDatasetsList}${
    recentDatasetsList && inactiveDatasetsList ? "\n" : ""
  }${inactiveDatasetsList}</pre>
  `;

  return {
    html: htmlContent,
    text: textContent,
  };
}
