import { parse as parseYaml } from "yaml";
import type { IParserStrategy, ParsedRequestData } from "./types";

export class YamlParser implements IParserStrategy {
  parse(content: string): ParsedRequestData | null {
    try {
      const parsed = parseYaml(content);
      if (parsed && parsed.info && parsed.info.type === 'http') {
        return {
          info: {
            name: parsed.info.name || "Unknown",
            type: parsed.info.type
          },
          http: {
            method: parsed.http?.method || 'GET',
            url: parsed.http?.url || ''
          },
          examples: parsed.examples || []
        };
      }
      return null;
    } catch (e) {
      console.error("Erreur de parsing .yml:", e);
      return null;
    }
  }
}
