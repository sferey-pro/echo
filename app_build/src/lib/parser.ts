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

import { BruParser } from "./parsers/BruParser";
import { YamlParser } from "./parsers/YamlParser";
import type { IParserStrategy } from "./parsers/types";

// In-memory cache for incremental parsing
const cachedFolders: Map<string, BrunoFolder> = new Map();
let cachedRootFolders: BrunoFolder[] = [];
const cachedRequests: Map<string, ApiRequest> = new Map();
let cachedEnvironments: BrunoEnvironment[] = [];
let isFullParseDone = false;

const bruParser = new BruParser();
const yamlParser = new YamlParser();

function getParserForFile(filename: string): IParserStrategy | null {
  if (filename.endsWith('.bru')) return bruParser;
  if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return yamlParser;
  return null;
}

export async function parseFile(basePath: string, fullPath: string): Promise<ApiRequest | null> {
  try {
    if (!existsSync(fullPath)) return null;
    
    const parser = getParserForFile(fullPath);
    if (!parser) return null;

    const content = await readFile(fullPath, 'utf-8');
    const parsed = parser.parse(content);
    
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
      folders: cachedRootFolders,
      requests: Array.from(cachedRequests.values()),
      environments: cachedEnvironments
    };
  }

  cachedFolders.clear();
  cachedRootFolders = [];
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
        const rootFolder = await traverse(join(basePath, entry.name));
        if (rootFolder) cachedRootFolders.push(rootFolder);
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
        if (entry.isFile()) {
           const content = await readFile(join(envPath, entry.name), 'utf-8');
           try {
             if (entry.name.endsWith('.yml') || entry.name.endsWith('.json')) {
               const parsed = entry.name.endsWith('.yml') ? parseYaml(content) : (JSON.parse(content) as Record<string, unknown>);
               const name = (parsed?.name as string) || basename(entry.name, entry.name.endsWith('.yml') ? '.yml' : '.json');
               cachedEnvironments.push({
                 name: name,
                 variables: (parsed?.variables as BrunoVariable[]) || []
               });
             } else if (entry.name.endsWith('.bru')) {
               const name = basename(entry.name, '.bru');
               const variables: BrunoVariable[] = [];
               
               // Regex to capture content inside vars { ... }
               const varsMatch = content.match(/vars\s*\{([\s\S]*?)\}/);
               if (varsMatch) {
                 const lines = varsMatch?.[1]?.split('\n') || [];
                 for (const line of lines) {
                   const trimmed = line.trim();
                   if (!trimmed || trimmed.startsWith('//')) continue;
                   
                   const firstColon = trimmed.indexOf(':');
                   if (firstColon > -1) {
                     // Wait, bru files usually have format `key: value`, but they can also be `key [ value ]` in older bru specs?
                     // Actually modern bru format for environments is `key: value`
                     const key = trimmed.substring(0, firstColon).trim();
                     // value can be wrapped in quotes or just raw text
                     let val = trimmed.substring(firstColon + 1).trim();
                     // Remove surrounding quotes if present (some versions of bru use them)
                     if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                         val = val.substring(1, val.length - 1);
                     }
                     
                     if (key) {
                       variables.push({ name: key, value: val });
                     }
                   }
                 }
               }
               
               cachedEnvironments.push({
                 name: name,
                 variables: variables
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
    folders: cachedRootFolders,
    requests: Array.from(cachedRequests.values()),
    environments: cachedEnvironments
  };
}
