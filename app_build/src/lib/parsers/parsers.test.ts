import { expect, test, describe } from "bun:test";
import { YamlParser } from "./YamlParser";
import { BruParser } from "./BruParser";

describe("Parser Strategies", () => {
  test("YamlParser should parse valid YML content", () => {
    const yamlContent = `
info:
  name: Test Request
  type: http
http:
  method: POST
  url: https://api.test.com/users
examples:
  - name: Example 1
    response:
      status: 200
      body:
        data: '{"success":true}'
`;
    const parser = new YamlParser();
    const result = parser.parse(yamlContent);
    
    expect(result).not.toBeNull();
    expect(result?.info.name).toBe("Test Request");
    expect(result?.http.method).toBe("POST");
    expect(result?.http.url).toBe("https://api.test.com/users");
    expect(result?.examples.length).toBe(1);
    expect(result?.examples[0].response.status).toBe(200);
  });

  test("BruParser should parse basic BRU content", () => {
    const bruContent = `
meta {
  name: Get User
  type: http
}

get {
  url: https://api.example.com/user/1
}
`;
    const parser = new BruParser();
    const result = parser.parse(bruContent);
    
    expect(result).not.toBeNull();
    expect(result?.info.name).toBe("Get User");
    expect(result?.http.method).toBe("GET");
    expect(result?.http.url).toBe("https://api.example.com/user/1");
  });
});
