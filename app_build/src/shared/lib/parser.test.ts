import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  clearParserCache,
  parseCollection,
  parseFile,
  removeFileFromCache,
} from "./parser";

const mockFs = {
  existsSync: mock(() => true),
};

const mockFsPromises = {
  // biome-ignore lint/suspicious/noExplicitAny: FIXME - needs proper typing
  readdir: mock<any>(async () => []),
  // biome-ignore lint/suspicious/noExplicitAny: FIXME - needs proper typing
  readFile: mock<any>(async () => ""),
};

mock.module("fs", () => mockFs);
mock.module("fs/promises", () => mockFsPromises);

describe("Parser (Shared)", () => {
  beforeEach(() => {
    mockFs.existsSync.mockClear();
    mockFsPromises.readdir.mockClear();
    mockFsPromises.readFile.mockClear();
  });

  afterEach(() => {
    mockFs.existsSync.mockImplementation(() => true);
    mockFsPromises.readdir.mockImplementation(async () => []);
    mockFsPromises.readFile.mockImplementation(async () => "");
  });

  it("clearParserCache and removeFileFromCache should not throw", () => {
    expect(() => clearParserCache()).not.toThrow();
    expect(() => removeFileFromCache("/tmp", "/tmp/file.bru")).not.toThrow();
  });

  it("parseFile should return null if file does not exist", async () => {
    mockFs.existsSync.mockImplementation(() => false);
    const req = await parseFile("/tmp", "/tmp/file.bru");
    expect(req).toBeNull();
  });

  it("parseFile should return null if unsupported extension", async () => {
    mockFs.existsSync.mockImplementation(() => true);
    const req = await parseFile("/tmp", "/tmp/file.txt");
    expect(req).toBeNull();
  });

  it("parseFile should parse a valid bru file", async () => {
    mockFs.existsSync.mockImplementation(() => true);
    mockFsPromises.readFile.mockImplementation(
      async () => `meta {
  name: Get User
  type: http
}
get {
  url: /users
}`,
    );
    const req = await parseFile("/tmp", "/tmp/Get User.bru");
    expect(req).not.toBeNull();
    expect(req?.name).toBe("Get User");
    expect(req?.method).toBe("GET");
    expect(req?.url).toBe("/users");
  });

  it("parseFile should return null if parsing fails", async () => {
    mockFs.existsSync.mockImplementation(() => true);
    mockFsPromises.readFile.mockImplementation(async () => {
      throw new Error("File error");
    });
    const req = await parseFile("/tmp", "/tmp/file.bru");
    expect(req).toBeNull();
  });

  it("parseCollection should return empty structure if base path does not exist", async () => {
    mockFs.existsSync.mockImplementation(() => false);
    const result = await parseCollection("/tmp");
    expect(result.folders).toEqual([]);
    expect(result.requests).toEqual([]);
    expect(result.environments).toEqual([]);
  });

  it("parseCollection should parse folders and requests correctly", async () => {
    mockFs.existsSync.mockImplementation(() => true);
    mockFsPromises.readdir.mockImplementation(async (path: string) => {
      if (path === "/tmp")
        return [
          { name: "folder1", isDirectory: () => true, isFile: () => false },
          { name: "req1.bru", isDirectory: () => false, isFile: () => true },
          {
            name: "environments",
            isDirectory: () => true,
            isFile: () => false,
          },
        ];
      if (path === "/tmp/folder1")
        return [
          { name: "folder.yml", isDirectory: () => false, isFile: () => true },
          { name: "req2.bru", isDirectory: () => false, isFile: () => true },
        ];
      if (path === "/tmp/environments")
        return [
          { name: "dev.yml", isDirectory: () => false, isFile: () => true },
        ];
      return [];
    });
    mockFsPromises.readFile.mockImplementation(async (path: string) => {
      if (path.endsWith("req1.bru") || path.endsWith("req2.bru"))
        return `meta {\n  name: Req\n  type: http\n}\nget {\n  url: /\n}`;
      if (path.endsWith("folder.yml")) return `info:\n  name: Folder 1`;
      if (path.endsWith("dev.yml"))
        return `name: Dev\nvariables:\n  - name: url\n    value: localhost`;
      return "";
    });

    const result = await parseCollection("/tmp");
    expect(result.folders.length).toBeGreaterThan(0);
    expect(result.requests.length).toBe(2);
    expect(result.environments.length).toBe(1);
  });
});
