import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { parse } from "yaml";
import { existsSync } from "fs";

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
  isStarred?: boolean;
  selectedExample?: string | null;
  statusCode?: number;
  latencyMs?: number;
  pathParamsOverrides?: Record<string, string>;
}

export interface BrunoVariable {
  name: string;
  value: string;
}

export interface BrunoEnvironment {
  name: string;
  variables: BrunoVariable[];
}

export interface ParserResult {
  folders: BrunoFolder[];
  requests: ApiRequest[];
  environments: BrunoEnvironment[];
}

export async function parseCollection(basePath: string): Promise<ParserResult> {
  const folders: BrunoFolder[] = [];
  const requests: ApiRequest[] = [];

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

    const relativeFolderPath = currentPath.replace(basePath, '');
    const currentFolderId = `f-${Buffer.from(relativeFolderPath).toString('base64url')}`;
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
            const relativeFilePath = fullPath.replace(basePath, '');
            requests.push({
              id: `r-${Buffer.from(relativeFilePath).toString('base64url')}`,
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
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'environments') {
        const folder = await traverse(join(basePath, entry.name));
        if (folder) folders.push(folder);
      } else if (entry.isFile() && entry.name.endsWith('.yml') && entry.name !== 'opencollection.yml') {
         const fullPath = join(basePath, entry.name);
         const content = await readFile(fullPath, 'utf-8');
         try {
           const parsed = parse(content);
           if (parsed?.info?.type === 'http') {
             const relativeFilePath = fullPath.replace(basePath, '');
             requests.push({
               id: `r-${Buffer.from(relativeFilePath).toString('base64url')}`,
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

  const environments: BrunoEnvironment[] = [];
  try {
    const envPath = join(basePath, 'environments');
    if (existsSync(envPath)) {
      const envEntries = await readdir(envPath, { withFileTypes: true });
      for (const entry of envEntries) {
        if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.json'))) {
           const content = await readFile(join(envPath, entry.name), 'utf-8');
           try {
             const parsed = entry.name.endsWith('.yml') ? parse(content) : JSON.parse(content);
             if (parsed && parsed.name) {
               environments.push({
                 name: parsed.name,
                 variables: parsed.variables || []
               });
             }
           } catch(e) {
             console.error(`Error parsing environment ${entry.name}`, e);
           }
        }
      }
    }
  } catch(e) {
    console.error("Error reading environments dir", e);
  }

  return { folders, requests, environments };
}
