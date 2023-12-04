import exec from "./exec.js";

export async function unzip(file, destination) {
  await exec("unzip", ["-o", file, "-d", destination]);
}
