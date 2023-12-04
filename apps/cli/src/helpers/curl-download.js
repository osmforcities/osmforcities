import exec from "./exec.js";

/**
 *
 * Helper function to download a file with curl.
 *
 * @param {string} url Target URL
 * @param {string} destination Local path destination
 * @param {Array} options Curl options
 */
export async function curlDownload(
  url,
  destination,
  options = [
    "-C", // Continue download if interrupted
    "-", // Continue download if interrupted
    "-L", // Follow redirects
    "-o",
  ]
) {
  // Download latest history file to local volume with curl
  await exec("curl", [...options, destination, url]);
}
