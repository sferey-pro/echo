import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { parse } from "yaml";

export interface BrunoFolder {
  id: string;
  name: string;
  children?: BrunoFolder[];
}

export interface BrunoExample {
  name: string;
  response: {
    status: number;
    body?: {
      data?: string;
    };
  };
}

export interface ApiRequest {
  id: string;
  folderId: string;
  name: string;
  method: string;
  url: string;
  examples: BrunoExample[];
  isMocked?: boolean;
  currentPayload?: string;
}

export interface ParserResult {
  folders: BrunoFolder[];
  requests: ApiRequest[];
}

export async function parseCollection(basePath: string): Promise<ParserResult> {
  const folders: BrunoFolder[] = [];
  const requests: ApiRequest[] = [];
  let idCounter = 1;

  async function traverse(currentPath: string): Promise<BrunoFolder | null> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    let folderName = basename(currentPath);
    const folderYmlEntry = entries.find(e => e.name === 'folder.yml');
    
    if (folderYmlEntry) {
      const content = await readFile(join(currentPath, 'folder.yml'), 'utf-8');
      const parsed = parse(content);
      folderName = parsed?.info?.name || folderName;
    }

    const currentFolderId = `f${idCounter++}`;
    const newFolder: BrunoFolder = {
      id: currentFolderId,
      name: folderName,
      children: []
    };

    for (const entry of entries) {
      if (entry.name === 'folder.yml' || entry.name === 'opencollection.yml' || entry.name.startsWith('.')) continue;

      const fullPath = join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFolder = await traverse(fullPath);
        if (subFolder) {
          newFolder.children!.push(subFolder);
        }
      } else if (entry.isFile() && entry.name.endsWith('.yml')) {
        const content = await readFile(fullPath, 'utf-8');
        try {
          const parsed = parse(content);
          if (parsed?.info?.type === 'http') {
            requests.push({
              id: `r${idCounter++}`,
              folderId: currentFolderId,
              name: parsed.info.name || entry.name.replace('.yml', ''),
              method: (parsed.http?.method || 'GET').toUpperCase(),
              url: parsed.http?.url || '',
              examples: parsed.examples || []
            });
          }
        } catch (e) {
          console.error(`Error parsing ${fullPath}`, e);
        }
      }
    }
    
    return newFolder;
  }

  try {
    const rootEntries = await readdir(basePath, { withFileTypes: true });
    rootEntries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of rootEntries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const folder = await traverse(join(basePath, entry.name));
        if (folder) folders.push(folder);
      } else if (entry.isFile() && entry.name.endsWith('.yml') && entry.name !== 'opencollection.yml') {
         const content = await readFile(join(basePath, entry.name), 'utf-8');
         try {
           const parsed = parse(content);
           if (parsed?.info?.type === 'http') {
             requests.push({
               id: `r${idCounter++}`,
               folderId: 'root',
               name: parsed.info.name || entry.name.replace('.yml', ''),
               method: (parsed.http?.method || 'GET').toUpperCase(),
               url: parsed.http?.url || '',
               examples: parsed.examples || []
             });
           }
         } catch (e) {
           console.error(`Error parsing root request ${entry.name}`, e);
         }
      }
    }
  } catch(e) {
    console.error("Error reading basePath: " + basePath, e);
  }

  return { folders, requests };
}
