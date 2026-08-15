import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { parse as parseYaml } from "yaml";
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

// In-memory cache for incremental parsing
let cachedFolders: Map<string, BrunoFolder> = new Map();
let cachedRequests: Map<string, ApiRequest> = new Map();
let cachedEnvironments: BrunoEnvironment[] = [];
let isFullParseDone = false;

function parseBruContent(content: string): any {
  // Simple bru parser
  const nameMatch = content.match(/meta\s*\{[\s\S]*?name:\s*(.+?)\n/);
  const name = nameMatch ? nameMatch[1].trim() : "Unknown";
  
  const methodMatch = content.match(/(get|post|put|delete|patch|options|head)\s*\{[\s\S]*?url:\s*(.+?)\n/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
  const url = methodMatch ? methodMatch[2].trim() : "";
  
  // Try to extract body (naive approach for examples)
  // Actually, bru doesn't store examples the same way. We'll return a mock example if not found
  return {
    info: { name, type: 'http' },
    http: { method, url },
    examples: []
  };
}

export async function parseFile(basePath: string, fullPath: string): Promise<ApiRequest | null> {
  try {
    if (!existsSync(fullPath)) return null;
    const content = await readFile(fullPath, 'utf-8');
    let parsed;
    if (fullPath.endsWith('.bru')) {
      parsed = parseBruContent(content);
    } else if (fullPath.endsWith('.yml') || fullPath.endsWith('.yaml')) {
      parsed = parseYaml(content);
    }
    
    if (parsed?.info?.type === 'http') {
      const relativeFilePath = fullPath.replace(basePath, '');
      const folderPath = relativeFilePath.substring(0, relativeFilePath.lastIndexOf('/'));
      const folderId = folderPath ? `f-${Buffer.from(folderPath).toString('base64url')}` : 'root';
      const fileName = basename(fullPath);
      
      const req: ApiRequest = {
        id: `r-${Buffer.from(relativeFilePath).toString('base64url')}`,
        folderId,
        name: parsed.info.name || fileName.replace(/\.(yml|bru)$/, ''),
        method: (parsed.http?.method || 'GET').toUpperCase(),
        url: parsed.http?.url || '',
        examples: parsed.examples || []
      };
      
      cachedRequests.set(req.id, req);
      return req;
    }
  } catch (e) {
    console.error(`Error parsing file ${fullPath}`, e);
  }
  return null;
}

export function removeFileFromCache(basePath: string, fullPath: string) {
  const relativeFilePath = fullPath.replace(basePath, '');
  const id = `r-${Buffer.from(relativeFilePath).toString('base64url')}`;
  cachedRequests.delete(id);
}

export async function parseCollection(basePath: string, forceFull: boolean = false): Promise<ParserResult> {
  if (isFullParseDone && !forceFull) {
    return {
      folders: Array.from(cachedFolders.values()),
      requests: Array.from(cachedRequests.values()),
      environments: cachedEnvironments
    };
  }

  cachedFolders.clear();
  cachedRequests.clear();
  cachedEnvironments = [];

  async function traverse(currentPath: string): Promise<BrunoFolder | null> {
    if (!existsSync(currentPath)) return null;
    const entries = await readdir(currentPath, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    let folderName = basename(currentPath);
    const folderYmlEntry = entries.find(e => e.name === 'folder.yml');
    
    if (folderYmlEntry) {
      const content = await readFile(join(currentPath, 'folder.yml'), 'utf-8');
      const parsed = parseYaml(content);
      folderName = parsed?.info?.name || folderName;
    }

    const relativeFolderPath = currentPath.replace(basePath, '');
    const currentFolderId = `f-${Buffer.from(relativeFolderPath).toString('base64url')}`;
    const newFolder: BrunoFolder = {
      id: currentFolderId,
      name: folderName,
      children: []
    };
    cachedFolders.set(currentFolderId, newFolder);

    for (const entry of entries) {
      if (entry.name === 'folder.yml' || entry.name === 'opencollection.yml' || entry.name.startsWith('.')) continue;

      const fullPath = join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFolder = await traverse(fullPath);
        if (subFolder) {
          if (!newFolder.children) newFolder.children = [];
          newFolder.children.push(subFolder);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.bru'))) {
        await parseFile(basePath, fullPath);
      }
    }
    
    return newFolder;
  }

  try {
    const rootEntries = await readdir(basePath, { withFileTypes: true });
    rootEntries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of rootEntries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'environments') {
        await traverse(join(basePath, entry.name));
      } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.bru')) && entry.name !== 'opencollection.yml') {
        await parseFile(basePath, join(basePath, entry.name));
      }
    }
  } catch(e) {
    console.error("Error reading basePath: " + basePath, e);
  }

  try {
    const envPath = join(basePath, 'environments');
    if (existsSync(envPath)) {
      const envEntries = await readdir(envPath, { withFileTypes: true });
      for (const entry of envEntries) {
        if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.json'))) {
           const content = await readFile(join(envPath, entry.name), 'utf-8');
           try {
             const parsed = entry.name.endsWith('.yml') ? parseYaml(content) : JSON.parse(content);
             if (parsed && parsed.name) {
               cachedEnvironments.push({
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

  isFullParseDone = true;
  
  return {
    folders: Array.from(cachedFolders.values()).filter(f => f.id !== 'root'), // Keep tree structure but return root level
    requests: Array.from(cachedRequests.values()),
    environments: cachedEnvironments
  };
}
