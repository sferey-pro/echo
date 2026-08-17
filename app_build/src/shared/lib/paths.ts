import { resolve, sep } from "path";

export function getSafeRepoPath(
  collectionName: string | undefined | null,
): string {
  const defaultBase = resolve(process.cwd(), "collection");
  const base = process.env.ECHO_DATA_DIR
    ? resolve(process.env.ECHO_DATA_DIR, "collection")
    : defaultBase;
  if (!collectionName || typeof collectionName !== "string") {
    return resolve(base, ".empty");
  }

  const targetPath = resolve(base, collectionName);
  const prefix = base.endsWith(sep) ? base : base + sep;

  if (!targetPath.startsWith(prefix) && targetPath !== base) {
    return resolve(base, ".empty");
  }

  return targetPath;
}
