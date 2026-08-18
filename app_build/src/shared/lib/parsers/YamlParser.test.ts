import { describe, expect, it } from "bun:test";
import { YamlParser } from "./YamlParser";

describe("YamlParser", () => {
  const parser = new YamlParser();

  it("should parse a valid .yml file correctly", () => {
    const yamlContent = `
info:
  name: Get Users
  type: http
http:
  method: GET
  url: https://api.example.com/users
examples:
  - name: Success
    response:
      status: 200
      body:
        data: '{"users": []}'
`;
    const result = parser.parse(yamlContent);

    expect(result).not.toBeNull();
    expect(result?.info?.name).toBe("Get Users");
    expect(result?.info?.type).toBe("http");
    expect(result?.http?.method).toBe("GET");
    expect(result?.http?.url).toBe("https://api.example.com/users");
    expect(result?.examples?.length).toBe(1);
    expect(result?.examples?.[0]?.name).toBe("Success");
    expect(result?.examples?.[0]?.response?.status).toBe(200);
  });

  it("should return null for invalid or non-http yaml", () => {
    const yamlContent = `
info:
  name: Just some config
  type: config
`;
    const result = parser.parse(yamlContent);
    expect(result).toBeNull();
  });
});
