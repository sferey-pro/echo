import type { BrunoExample } from "../parser";

export interface ParsedRequestData {
  info: {
    name: string;
    type: string;
  };
  http: {
    method: string;
    url: string;
  };
  examples: BrunoExample[];
}

export interface IParserStrategy {
  parse(content: string): ParsedRequestData | null;
}
