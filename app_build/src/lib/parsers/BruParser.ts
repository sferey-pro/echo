import type { IParserStrategy, ParsedRequestData } from "./types";

export class BruParser implements IParserStrategy {
  parse(content: string): ParsedRequestData | null {
    try {
      const nameMatch = content.match(/meta\s*\{[\s\S]*?name:\s*(.+?)\n/);
      const name = nameMatch?.[1]?.trim() || "Unknown";
      
      const methodMatch = content.match(/(get|post|put|delete|patch|options|head)\s*\{[\s\S]*?url:\s*(.+?)\n/i);
      const method = methodMatch?.[1]?.toUpperCase() || "GET";
      const url = methodMatch?.[2]?.trim() || "";
      
      // En l'état, Bruno (.bru format) n'a pas un concept unifié d'exemples dans le langage textuel de base 
      // qui soit trivial à parser via Regex. On peut l'enrichir plus tard avec un AST.
      return {
        info: { name, type: 'http' },
        http: { method, url },
        examples: []
      };
    } catch (e) {
      console.error("Erreur de parsing .bru:", e);
      return null;
    }
  }
}
