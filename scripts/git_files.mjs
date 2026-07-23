import { existsSync } from "node:fs";
import path from "node:path";

export function existingWorkingTreeFiles(root, files) {
  return files.filter((relativeFile) => existsSync(path.join(root, relativeFile)));
}
