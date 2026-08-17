import { resolve, sep } from "path";

export function getSafeRepoPath(collectionName: string | undefined | null): string {
  const base = resolve(process.cwd(), '../collection');
  if (!collectionName || typeof collectionName !== 'string') {
    return resolve(base, '.empty');
  }
  
  const targetPath = resolve(base, collectionName);
  const prefix = base.endsWith(sep) ? base : base + sep;
  
  if (!targetPath.startsWith(prefix) && targetPath !== base) {
    return resolve(base, '.empty');
  }
  
  return targetPath;
}
