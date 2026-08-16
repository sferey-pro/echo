import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { parse as parseYaml } from "yaml";
import { existsSync } from "fs";
import { syncBrunoItemsToDb } from "./db";

export interface BrunoFolder {
 id: string;
 name: string;
 children?: BrunoFolder[];
 isObsolete?: boolean;
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
 isObsolete?: boolean;
 // UI state (kept for backward compatibility with components)
 isStarred?: boolean;
 // Variants
 variants?: any[]; // Array of MockVariantDef
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

export function clearParserCache() {
 // Plus besoin de cache, tout est dans SQLite !
}

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
 
 req.examples = parsed.examples || [];
 return req;
 }
 } catch (e) {
 console.error(`Error parsing file ${fullPath}`, e);
 }
 return null;
}

export function removeFileFromCache(basePath: string, fullPath: string) {
 // Plus besoin
}

export async function parseCollection(basePath: string, forceFull: boolean = false): Promise<ParserResult> {
 if (!existsSync(basePath)) {
 return { folders: [], requests: [], environments: [] };
 }

 const localFolders = new Map<string, BrunoFolder>();
 const localRootFolders: BrunoFolder[] = [];
 const localRequests: ApiRequest[] = [];
 const localEnvironments: BrunoEnvironment[] = [];

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
 localFolders.set(currentFolderId, newFolder);

 for (const entry of entries) {
 if (entry.name === 'folder.yml' || entry.name === 'opencollection.yml' || entry.name.startsWith('.')) continue;

 const fullPath = join(currentPath, entry.name);
 
 if (entry.isDirectory()) {
 if (entry.name.toLowerCase() === 'environments') continue;
 const subFolder = await traverse(fullPath);
 if (subFolder) {
 if (!newFolder.children) newFolder.children = [];
 newFolder.children.push(subFolder);
 }
 } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.bru'))) {
 const req = await parseFile(basePath, fullPath);
 if (req) localRequests.push(req);
 }
 }
 
 return newFolder;
 }

 try {
 const rootEntries = await readdir(basePath, { withFileTypes: true });
 rootEntries.sort((a, b) => a.name.localeCompare(b.name));
 for (const entry of rootEntries) {
 if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name.toLowerCase() !== 'environments') {
 const rootFolder = await traverse(join(basePath, entry.name));
 if (rootFolder) localRootFolders.push(rootFolder);
 } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.bru')) && entry.name !== 'opencollection.yml') {
 const req = await parseFile(basePath, join(basePath, entry.name));
 if (req) localRequests.push(req);
 }
 }
 } catch(e) {
 console.error("Error reading basePath: " + basePath, e);
 }

 async function loadEnvironmentsFromDir(envPath: string) {
 if (!existsSync(envPath)) return;
 try {
 const envEntries = await readdir(envPath, { withFileTypes: true });
 for (const entry of envEntries) {
 if (entry.isFile()) {
 const content = await readFile(join(envPath, entry.name), 'utf-8');
 try {
 if (entry.name.endsWith('.yml') || entry.name.endsWith('.json')) {
 const parsed = entry.name.endsWith('.yml') ? parseYaml(content) : (JSON.parse(content) as Record<string, unknown>);
 const name = (parsed?.name as string) || basename(entry.name, entry.name.endsWith('.yml') ? '.yml' : '.json');
 localEnvironments.push({
 name: name,
 variables: (parsed?.variables as BrunoVariable[]) || []
 });
 } else if (entry.name.endsWith('.bru')) {
 const name = basename(entry.name, '.bru');
 const variables: BrunoVariable[] = [];
 
 const varsMatch = content.match(/vars\s*\{([\s\S]*?)\}/);
 if (varsMatch) {
 const lines = varsMatch?.[1]?.split('\n') || [];
 for (const line of lines) {
 const trimmed = line.trim();
 if (!trimmed || trimmed.startsWith('//')) continue;
 
 const firstColon = trimmed.indexOf(':');
 if (firstColon > -1) {
 const key = trimmed.substring(0, firstColon).trim();
 let val = trimmed.substring(firstColon + 1).trim();
 if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
 val = val.substring(1, val.length - 1);
 }
 if (key) {
 variables.push({ name: key, value: val });
 }
 }
 }
 }
 localEnvironments.push({
 name: name,
 variables: variables
 });
 }
 } catch(e) {
 console.error(`Error parsing environment ${entry.name}`, e);
 }
 }
 }
 } catch(e) {
 console.error(`Error reading environments dir ${envPath}`, e);
 }
 }

 async function searchAndLoadEnvironments(currentPath: string) {
 if (!existsSync(currentPath)) return;
 try {
 const entries = await readdir(currentPath, { withFileTypes: true });
 for (const entry of entries) {
 if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
 if (entry.name.toLowerCase() === 'environments') {
 await loadEnvironmentsFromDir(join(currentPath, entry.name));
 } else {
 await searchAndLoadEnvironments(join(currentPath, entry.name));
 }
 }
 }
 } catch (e) {
 console.error(`Error searching environments in ${currentPath}`, e);
 }
 }

 await searchAndLoadEnvironments(basePath);

 return {
 folders: localRootFolders,
 requests: localRequests,
 environments: localEnvironments
 };
}

export async function syncGitToDatabase(basePath: string) {
 const data = await parseCollection(basePath, true);
 syncBrunoItemsToDb(data.requests, data.folders, data.environments);
}
